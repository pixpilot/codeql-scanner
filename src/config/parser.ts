import type { CodeQLConfig } from '../types';
import { FileUtils } from '../utils/file-utils';
import { Logger } from '../utils/logger';
import { filterValidPathsFromRawYaml } from './utils/filter-valid-paths-from-raw-yaml';
import { filterValidQueryFilters } from './utils/filter-valid-query-filters';
import { safeParseYaml } from './utils/safe-parse-yaml';

export class ConfigParser {
  private static _parseConfigContent(
    rawContent: string,
    config: Record<string, unknown> | null,
    logPrefix: string,
  ): CodeQLConfig {
    if (config === null) {
      Logger.error(`${logPrefix} YAML parse error: Invalid YAML or not an object.`);
      return {
        paths: [],
        'paths-ignore': [],
        'query-filters': [],
        packs: [],
      };
    }
    // For paths and paths-ignore, use raw YAML to extract only valid entries
    const pathsMatch = rawContent.match(/paths:[\s\S]*?(?=\n\w|$)/u);
    const pathsIgnoreMatch = rawContent.match(/paths-ignore:[\s\S]*?(?=\n\w|$)/u);
    const packsMatch = rawContent.match(/packs:[\s\S]*?(?=\n\w|$)/u);
    const paths = filterValidPathsFromRawYaml(pathsMatch ? pathsMatch[0] : '');
    const pathsIgnore = filterValidPathsFromRawYaml(
      pathsIgnoreMatch ? pathsIgnoreMatch[0] : '',
    );
    const packs = filterValidPathsFromRawYaml(packsMatch ? packsMatch[0] : '');
    const queryFilters = filterValidQueryFilters(config['query-filters']);
    const finalConfig: CodeQLConfig = {
      paths,
      'paths-ignore': pathsIgnore,
      'query-filters': queryFilters,
      packs,
    };
    if ('languages' in config) {
      if (typeof config.languages === 'string') {
        // Handle scalar format (deprecated but still supported for backwards compatibility)
        finalConfig.languages = config.languages;
      } else if (Array.isArray(config.languages)) {
        // Handle array format (correct CodeQL configuration format)
        finalConfig.languages = config.languages.join(',');
      }
    }
    Logger.info(`${logPrefix} Parsed configuration: ${JSON.stringify(finalConfig)}`);
    return finalConfig;
  }

  static async parseConfigString(configString: string): Promise<CodeQLConfig> {
    try {
      const config = safeParseYaml(configString);
      return this._parseConfigContent(configString, config, 'From string:');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Failed to parse configuration string: ${errorMessage}`);
      throw error;
    }
  }

  static async parseConfigFile(configPath: string): Promise<CodeQLConfig> {
    try {
      if (!FileUtils.exists(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
      }
      const configContent = FileUtils.readFile(configPath);
      const config = safeParseYaml(configContent);
      return this._parseConfigContent(configContent, config, 'From file:');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Failed to parse configuration file: ${errorMessage}`);
      throw error;
    }
  }
}
