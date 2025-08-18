import type { CodeQLConfig } from '../types';

import { exec } from '@actions/exec';

import { Logger } from '../utils/logger';

export class QueryPackManager {
  static async downloadQueryPacks(codeqlPath: string): Promise<void> {
    if (!codeqlPath || codeqlPath.trim() === '') {
      throw new Error('CodeQL path is required but was not provided or is empty');
    }

    Logger.info('Checking CodeQL query packs availability...');

    // First, check if query packs are already available (e.g., from bundle)
    try {
      await exec(codeqlPath, ['resolve', 'packs'], { silent: true });
      Logger.info('Query packs are already available from CodeQL bundle');
      return;
    } catch {
      Logger.info('Query packs not found in bundle, downloading...');
    }

    // Common query packs to download
    const queryPacks = [
      'codeql/javascript-queries',
      'codeql/python-queries',
      'codeql/java-queries',
      'codeql/csharp-queries',
      'codeql/cpp-queries',
      'codeql/go-queries',
    ];

    const downloadPromises = queryPacks.map(async (pack) => {
      try {
        Logger.info(`Downloading query pack: ${pack}`);
        await exec(codeqlPath, ['pack', 'download', pack], {
          silent: true,
          ignoreReturnCode: true, // Don't fail if a specific pack isn't available
        });
      } catch {
        // Silently continue if pack download fails
        Logger.debug(`Failed to download query pack: ${pack}`);
      }
    });

    await Promise.all(downloadPromises);

    Logger.info('Query pack download completed');
  }

  /**
   * Get query packs for a language and profiles, with support for config-based packs override
   */
  static getQueryPacks(
    language: string,
    profiles: string[],
    config?: CodeQLConfig,
  ): string[] {
    // If config has custom packs defined, use those instead
    if (config?.packs && config.packs.length > 0) {
      Logger.info(
        `Using custom packs from configuration: ${JSON.stringify(config.packs)}`,
      );
      return config.packs;
    }

    // Generate packs based on language and profiles
    const packs: string[] = [];

    for (const profile of profiles) {
      const pack = this.getQueryPack(language, profile);
      if (pack && !packs.includes(pack)) {
        packs.push(pack);
      }
    }

    Logger.info(
      `Generated query packs for ${language} with profiles [${profiles.join(', ')}]: ${JSON.stringify(packs)}`,
    );
    return packs;
  }

  /**
   * Get a single query pack for a language and profile (simplified version)
   */
  static getQueryPack(language: string, profile: string): string {
    const normalizedLanguage = language.toLowerCase();
    const normalizedProfile = profile.toLowerCase();

    // Map JavaScript/TypeScript to javascript queries
    const languageMap: Record<string, string> = {
      javascript: 'javascript',
      typescript: 'javascript',
      python: 'python',
      java: 'java',
      csharp: 'csharp',
      cpp: 'cpp',
      c: 'cpp',
      go: 'go',
    };

    const mappedLanguage = languageMap[normalizedLanguage] ?? normalizedLanguage;

    // Build the query pack path based on profile
    let suite: string;
    switch (normalizedProfile) {
      case 'security-extended':
        suite = `${mappedLanguage}-security-extended`;
        break;
      case 'security-and-quality':
      case 'security':
      default:
        suite = `${mappedLanguage}-security-and-quality`;
        break;
    }

    const queryPack = `codeql/${mappedLanguage}-queries:codeql-suites/${suite}.qls`;

    Logger.info(
      `Generated query pack for ${language} with profile ${profile}: ${queryPack}`,
    );
    return queryPack;
  }

  /**
   * Parse profiles from comma-separated string
   */
  static parseProfiles(profilesString: string): string[] {
    if (!profilesString || profilesString.trim() === '') {
      return ['security-and-quality'];
    }

    return profilesString
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  /**
   * Parse languages from comma-separated string, supporting matrix expressions
   */
  static parseLanguages(languagesString: string): string[] {
    if (!languagesString || languagesString.trim() === '') {
      return ['javascript'];
    }

    // Handle matrix expressions like ${{ matrix.language }}
    const matrixMatch = languagesString.match(/\$\{\{\s*matrix\.language\s*\}\}/u);
    if (matrixMatch) {
      // For matrix expressions, we can't resolve at build time, so return as-is
      // This will need to be handled at runtime by the calling code
      Logger.info('Detected matrix expression in languages, will resolve at runtime');
      return [languagesString];
    }

    return languagesString
      .split(',')
      .map((lang) => lang.trim())
      .filter((lang) => lang.length > 0);
  }
}
