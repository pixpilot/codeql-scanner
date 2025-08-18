import type { AnalysisInputs } from './types';

import { CodeQLAnalyzer } from './codeql/analyzer';
import { CodeQLDatabase } from './codeql/database';
import { CodeQLInstaller } from './codeql/installer';
import { QueryPackManager } from './codeql/query-packs';
import { getInputs } from './config/get-inputs';
import { loadConfig } from './config/utils/load-config';
import { FileFilter } from './file-filtering/filter';
import { IssueCreator } from './github/issue-creator';
import { SarifProcessor } from './sarif/processor';
import { Logger } from './utils/logger';

/**
 * Main entry point for the action
 */
async function run(): Promise<void> {
  try {
    // Get inputs
    const inputs: AnalysisInputs = getInputs();

    // Step 1: Parse configuration from config string or config file
    const config = await loadConfig(inputs);

    // Step 2: Filter files based on configuration
    const filteredPath = await FileFilter.filterFiles(config ?? undefined);
    Logger.info(`Filtered files location: ${filteredPath}`);

    // Parse languages, handling matrix expressions and comma-separated values
    const languages = QueryPackManager.parseLanguages(inputs.languages);
    const primaryLanguage = languages[0] ?? 'javascript';

    // If using matrix expression, ensure it's a single resolved language at this point
    if (primaryLanguage.includes('matrix.language')) {
      throw new Error(
        'Matrix expressions must be resolved before running the action. Use a matrix strategy in your workflow.',
      );
    }

    Logger.info(`Using language(s): ${languages.join(', ')}`);
    Logger.info(`Primary language for database creation: ${primaryLanguage}`);

    // Step 3: Initialize CodeQL
    const codeqlPath = await CodeQLInstaller.initializeCodeQL(primaryLanguage);
    Logger.info(`CodeQL initialized at: ${codeqlPath}`);

    // Step 3.5: Download query packs for better compatibility
    await QueryPackManager.downloadQueryPacks(codeqlPath);

    // Step 4: Create CodeQL database
    await CodeQLDatabase.createDatabase(
      codeqlPath,
      filteredPath,
      primaryLanguage,
      config ?? undefined,
    );
    Logger.info('CodeQL database created successfully');

    // Step 5: Analyze with CodeQL
    await CodeQLAnalyzer.analyzeWithCodeQL(
      codeqlPath,
      languages.join(','), // Pass all languages
      inputs.qlsProfile,
      config ?? undefined,
    );
    Logger.info('CodeQL analysis completed');

    // Step 6: Process SARIF and create issues
    const sarif = SarifProcessor.processSarifFile(CodeQLAnalyzer.getResultsPath());
    if (sarif) {
      await IssueCreator.createIssuesFromSarif(sarif, inputs.token);
      Logger.info('SARIF processing and issue creation completed');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    Logger.setFailed(`Action failed: ${errorMessage}`);
    Logger.debug(errorStack ?? 'No stack trace available');
  }
}

// Run the action
if (require.main === module) {
  run().catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.setFailed(`Unhandled error: ${errorMessage}`);
  });
}

export { run };
