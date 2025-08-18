import type { CodeQLConfig, QueryFilter, SarifReport } from '../types';

import * as fs from 'node:fs';
import * as process from 'node:process';

import { exec } from '@actions/exec';

import { FileUtils } from '../utils/file-utils';
import { Logger } from '../utils/logger';
import { CodeQLDatabase } from './database';
import { QueryPackManager } from './query-packs';

export class CodeQLAnalyzer {
  static async analyzeWithCodeQL(
    codeqlPath: string,
    language: string,
    qlsProfile: string,
    config?: CodeQLConfig,
  ): Promise<void> {
    Logger.info('Running CodeQL analysis...');

    const dbPath = CodeQLDatabase.getDatabasePath();
    const outputPath = FileUtils.joinPath(process.cwd(), 'results.sarif');

    // Use language from config if available, otherwise use input parameter
    const effectiveLanguage = config?.languages ?? language;
    const languages = effectiveLanguage
      .split(',')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const isMultiLanguage = languages.length > 1;

    if (isMultiLanguage) {
      Logger.info(`Multi-language analysis for: ${languages.join(', ')}`);
      const sarifFiles: string[] = [];

      // Analyze each language separately by calling analyzeSingleLanguage
      for (const lang of languages) {
        const langDbPath = FileUtils.joinPath(dbPath, lang);
        const langOutputPath = FileUtils.joinPath(process.cwd(), `results-${lang}.sarif`);

        if (FileUtils.exists(langDbPath)) {
          Logger.info(`Analyzing ${lang} database...`);
          // eslint-disable-next-line no-await-in-loop
          await this.analyzeSingleLanguage(
            codeqlPath,
            lang,
            qlsProfile,
            langDbPath,
            langOutputPath,
            config,
          );
          sarifFiles.push(langOutputPath);
        } else {
          Logger.warning(`Database not found for language: ${lang} at ${langDbPath}`);
        }
      }

      // Merge SARIF files if multiple languages were analyzed
      if (sarifFiles.length > 1) {
        await this.mergeSarifFiles(sarifFiles, outputPath);
      } else if (sarifFiles.length === 1) {
        // Just copy the single SARIF file
        await this.copySarifFile(sarifFiles[0], outputPath);
      }

      // Apply query filters from config if specified
      if (config?.['query-filters'] && config['query-filters'].length > 0) {
        await this.applyQueryFilters(outputPath, config['query-filters']);
      }
    } else {
      Logger.info(`Single language analysis for: ${languages[0]}`);
      await this.analyzeSingleLanguage(
        codeqlPath,
        languages[0],
        qlsProfile,
        dbPath,
        outputPath,
        config,
      );

      // Apply query filters from config if specified for single language analysis
      if (config?.['query-filters'] && config['query-filters'].length > 0) {
        await this.applyQueryFilters(outputPath, config['query-filters']);
      }
    }
  }

  private static async analyzeSingleLanguage(
    codeqlPath: string,
    language: string,
    qlsProfile: string,
    dbPath: string,
    outputPath: string,
    config?: CodeQLConfig,
  ): Promise<void> {
    // Parse profiles from comma-separated string
    const profiles = QueryPackManager.parseProfiles(qlsProfile);

    // Get query packs (either from config or generated from language and profiles)
    const queryPacks = QueryPackManager.getQueryPacks(language, profiles, config);

    // Ensure we have at least one query pack
    if (queryPacks.length === 0) {
      queryPacks.push(`codeql/${language.toLowerCase()}-queries`);
    }

    Logger.info(
      `Running analysis with ${queryPacks.length} query pack(s): ${queryPacks.join(', ')}`,
    );

    const packSarifFiles: string[] = [];

    // Analyze with each query pack
    for (let i = 0; i < queryPacks.length; i++) {
      const queryPack = queryPacks[i];
      const packOutputPath =
        queryPacks.length === 1
          ? outputPath
          : outputPath.replace('.sarif', `-pack-${i}.sarif`);

      Logger.info(
        `Analyzing with query pack ${i + 1}/${queryPacks.length}: ${queryPack}`,
      );

      try {
        const args = [
          'database',
          'analyze',
          dbPath,
          '--ram=4000',
          '--format=sarif-latest',
          `--output=${packOutputPath}`,
          '--threat-model=local,remote', // Include local threat model for comprehensive detection
          queryPack,
        ];

        // eslint-disable-next-line no-await-in-loop
        await exec(codeqlPath, args);
        packSarifFiles.push(packOutputPath);
      } catch (error) {
        // If the specific query suite fails, try with a simpler approach
        const errorMessage = error instanceof Error ? error.message : String(error);
        Logger.warning(`Failed to analyze with ${queryPack}: ${errorMessage}`);

        // Only try fallback for the first pack to avoid duplicate fallback attempts
        if (i === 0) {
          Logger.warning('Trying fallback approach...');
          const fallbackQueryPack = `codeql/${language.toLowerCase()}-queries`;
          Logger.info(`Using fallback query pack: ${fallbackQueryPack}`);

          const fallbackArgs = [
            'database',
            'analyze',
            dbPath,
            '--ram=4000',
            '--format=sarif-latest',
            `--output=${packOutputPath}`,
            '--threat-model=local,remote', // Include local threat model for comprehensive detection
            fallbackQueryPack,
          ];

          try {
            // eslint-disable-next-line no-await-in-loop
            await exec(codeqlPath, fallbackArgs);
            packSarifFiles.push(packOutputPath);
          } catch (fallbackError) {
            const fallbackErrorMessage =
              fallbackError instanceof Error
                ? fallbackError.message
                : String(fallbackError);
            Logger.warning(`Fallback analysis also failed: ${fallbackErrorMessage}`);
          }
        }
      }
    }

    // If we have multiple SARIF files from different packs, merge them
    if (packSarifFiles.length > 1) {
      Logger.info(`Merging ${packSarifFiles.length} query pack results...`);
      await this.mergeSarifFiles(packSarifFiles, outputPath);

      // Clean up individual pack files
      for (const packFile of packSarifFiles) {
        if (packFile !== outputPath && FileUtils.exists(packFile)) {
          try {
            fs.unlinkSync(packFile);
          } catch {
            // Ignore cleanup errors
          }
        }
      }
    }

    // Apply query filters are applied at the multi-language level, not here
  }

  private static async mergeSarifFiles(
    sarifFiles: string[],
    outputPath: string,
  ): Promise<void> {
    Logger.info(`Merging ${sarifFiles.length} SARIF files...`);

    const mergedSarif: SarifReport = {
      runs: [],
    };

    for (const sarifFile of sarifFiles) {
      if (FileUtils.exists(sarifFile)) {
        try {
          const content = FileUtils.readFile(sarifFile);
          const sarif: SarifReport = JSON.parse(content) as SarifReport;

          if (sarif.runs && Array.isArray(sarif.runs)) {
            mergedSarif.runs!.push(...sarif.runs);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          Logger.warning(`Failed to parse SARIF file ${sarifFile}: ${errorMessage}`);
        }
      }
    }

    const JSON_INDENT = 2;
    FileUtils.writeFile(outputPath, JSON.stringify(mergedSarif, null, JSON_INDENT));
    Logger.info(`Merged SARIF saved to: ${outputPath}`);
  }

  private static async copySarifFile(
    sourcePath: string,
    targetPath: string,
  ): Promise<void> {
    const content = FileUtils.readFile(sourcePath);
    FileUtils.writeFile(targetPath, content);
  }

  private static async applyQueryFilters(
    sarifPath: string,
    queryFilters: QueryFilter[],
  ): Promise<void> {
    Logger.info('Applying query filters to SARIF results...');

    if (!FileUtils.exists(sarifPath)) {
      Logger.warning('SARIF file not found for filtering');
      return;
    }

    try {
      const sarif: SarifReport = JSON.parse(FileUtils.readFile(sarifPath)) as SarifReport;

      let filteredCount = 0;
      let totalCount = 0;

      if (sarif.runs && Array.isArray(sarif.runs)) {
        for (const run of sarif.runs) {
          if (run.results && Array.isArray(run.results)) {
            const originalCount = run.results.length;
            totalCount += originalCount;

            // Count filtered results before applying filter
            const filteredResults = run.results.filter(
              (result) =>
                !queryFilters.some((filter) => {
                  if (
                    filter.exclude?.id !== undefined &&
                    filter.exclude.id.length > 0 &&
                    result.ruleId === filter.exclude.id
                  ) {
                    Logger.debug(`Filtered out result for rule: ${result.ruleId}`);
                    return true; // This result should be filtered out
                  }
                  return false; // This result should be kept
                }),
            );

            filteredCount += originalCount - filteredResults.length;
            run.results = filteredResults;
          }
        }
      }

      // Write the filtered SARIF back to file
      const JSON_INDENT = 2;
      FileUtils.writeFile(sarifPath, JSON.stringify(sarif, null, JSON_INDENT));

      Logger.info(
        `Query filters applied: ${filteredCount} results filtered out of ${totalCount}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.warning(`Failed to apply query filters: ${errorMessage}`);
    }
  }

  static getResultsPath(): string {
    return FileUtils.joinPath(process.cwd(), 'results.sarif');
  }
}
