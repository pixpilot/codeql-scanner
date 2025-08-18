import type { CodeQLConfig } from '../../types';
import { Logger } from '../../utils/logger';
import { ConfigParser } from '../parser';

export async function loadConfig(inputs: {
  config?: string;
  configFile?: string;
}): Promise<CodeQLConfig | null> {
  let fileConfig: CodeQLConfig | null = null;
  let stringConfig: CodeQLConfig | null = null;

  if (inputs.configFile !== undefined && inputs.configFile.length > 0) {
    Logger.info(`Attempting to load config file: ${inputs.configFile}`);
    fileConfig = await ConfigParser.parseConfigFile(inputs.configFile);
    Logger.info('Configuration file loaded successfully');
    Logger.info(
      `Config paths: ${fileConfig?.paths ? JSON.stringify(fileConfig.paths) : 'none'}`,
    );
    Logger.info(
      `Config paths-ignore: ${fileConfig?.['paths-ignore'] ? JSON.stringify(fileConfig['paths-ignore']) : 'none'}`,
    );
  }

  if (inputs.config !== undefined && inputs.config.length > 0) {
    stringConfig = await ConfigParser.parseConfigString(inputs.config);
    Logger.info('Configuration provided as YAML string parsed successfully');
  }

  if (fileConfig && stringConfig) {
    // Merge configs, stringConfig overrides fileConfig
    return { ...fileConfig, ...stringConfig };
  }
  if (stringConfig) {
    return stringConfig;
  }
  if (fileConfig) {
    return fileConfig;
  }
  Logger.info('No configuration provided - all files will be included');
  return null;
}
