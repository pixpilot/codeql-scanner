import type { SarifReport } from '../types';

import { FileUtils } from '../utils/file-utils';
import { Logger } from '../utils/logger';

export class SarifProcessor {
  static processSarifFile(sarifPath: string): SarifReport | null {
    // A successful analysis always writes a SARIF file, with an empty results array
    // when nothing is found. A missing file means the scan did not run, so this must
    // never be reported as a clean scan.
    if (!FileUtils.exists(sarifPath)) {
      Logger.error(
        `No SARIF file was produced at ${sarifPath}. The analysis did not complete, so these results cannot be treated as a clean scan.`,
      );
      return null;
    }

    try {
      const sarif: SarifReport = JSON.parse(FileUtils.readFile(sarifPath)) as SarifReport;

      if (!sarif.runs || sarif.runs.length === 0) {
        Logger.info('No runs found in SARIF file.');
        return null;
      }

      return sarif;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Failed to process SARIF file: ${errorMessage}`);
      throw error;
    }
  }

  static validateSarif(sarif: SarifReport): boolean {
    return Boolean(sarif.runs && Array.isArray(sarif.runs) && sarif.runs.length > 0);
  }

  static getTotalResultsCount(sarif: SarifReport): number {
    if (!sarif.runs) return 0;

    return sarif.runs.reduce((total, run) => total + (run.results?.length ?? 0), 0);
  }
}
