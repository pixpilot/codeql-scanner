import type { AnalysisInputs } from '../types';
import * as core from '@actions/core';
import { Logger } from '../utils/logger';

export function getInputs(): AnalysisInputs {
  const inputs: AnalysisInputs = {
    languages: core.getInput('languages') || 'javascript',
    sourceRoot: core.getInput('source-root'),
    ram: core.getInput('ram'),
    threads: core.getInput('threads'),
    debug: core.getBooleanInput('debug'),
    config: core.getInput('config'),
    configFile: core.getInput('config-file'),
    qlsProfile: core.getInput('qls-profile') || 'security-and-quality',
    token: core.getInput('token', { required: true }),
  };

  Logger.info(`QLS Profile: ${inputs.qlsProfile}`);
  if (inputs.sourceRoot !== undefined && inputs.sourceRoot.length > 0) {
    Logger.info(`Source root: ${inputs.sourceRoot}`);
  }
  if (inputs.ram !== undefined && inputs.ram.length > 0) {
    Logger.info(`RAM limit: ${inputs.ram}MB`);
  }
  if (inputs.threads !== undefined && inputs.threads.length > 0) {
    Logger.info(`Thread count: ${inputs.threads}`);
  }
  if (inputs.debug) {
    Logger.info('Debug mode enabled');
  }
  if (inputs.config !== undefined && inputs.config.length > 0) {
    Logger.info('Config provided as YAML string');
  }
  if (inputs.configFile !== undefined && inputs.configFile.length > 0) {
    Logger.info(`Config file: ${inputs.configFile}`);
  }

  return inputs;
}
