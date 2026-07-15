import type { CodeQLResult, IssueData, SarifReport } from '../types';

import * as crypto from 'node:crypto';

import { getOctokit } from '@actions/github';
import * as github from '@actions/github';

import { Logger } from '../utils/logger';
import { formatIssueBody } from './utils/format-issue-body';

export class IssueCreator {
  static async createIssuesFromSarif(sarif: SarifReport, token: string): Promise<void> {
    const FINGERPRINT_LENGTH = 8;

    const octokit = getOctokit(token);
    const { context } = github;

    // Get all existing issues with the codeql-finding label
    const { data: allIssues } = await octokit.rest.issues.listForRepo({
      ...context.repo,
      state: 'all',
      labels: 'codeql-finding',
    });

    const issueCreations: Array<{
      owner: string;
      repo: string;
      title: string;
      body: string;
      labels: string[];
    }> = [];

    if (!sarif.runs) return;

    for (const run of sarif.runs) {
      if (!run.results) {
        // Skip this run if no results
      } else {
        for (const result of run.results) {
          const issueData = this.createIssueFromResult(result, FINGERPRINT_LENGTH);

          // Check if issue already exists
          const existingIssue = allIssues.find(
            (issue) => issue.title === issueData.title,
          );

          if (existingIssue) {
            if (existingIssue.state === 'closed') {
              Logger.info(
                `Issue "${issueData.title}" was previously closed. Respecting user decision - not reopening.`,
              );
            } else {
              Logger.info(
                `Issue "${issueData.title}" already exists and is open. Skipping.`,
              );
            }
          } else {
            issueCreations.push({
              ...context.repo,
              ...issueData,
            });
          }
        }
      }
    }

    await this.createIssuesInParallel(octokit, issueCreations);
  }

  private static createIssueFromResult(
    result: CodeQLResult,
    fingerprintLength: number,
  ): IssueData {
    const { ruleId, message, partialFingerprints } = result;
    const msg = message.text;

    // Create unique fingerprint for this finding
    const findingHash = crypto
      .createHash('md5')
      .update(`${ruleId}|${JSON.stringify(partialFingerprints)}|${msg}`)
      .digest('hex')
      .substring(0, fingerprintLength);

    const title = `CodeQL Finding: ${ruleId} [${findingHash}]`;

    return {
      title,
      body: formatIssueBody(result, findingHash),
      labels: ['codeql-finding'],
    };
  }

  private static async createIssuesInParallel(
    octokit: ReturnType<typeof getOctokit>,
    issueCreations: Array<{
      owner: string;
      repo: string;
      title: string;
      body: string;
      labels: string[];
    }>,
  ): Promise<void> {
    if (issueCreations.length === 0) {
      Logger.info('No new issues to create.');
      return;
    }

    Logger.info(`Creating ${issueCreations.length} new issues...`);

    let successCount = 0;
    let permissionErrors = 0;
    let otherErrors = 0;

    await Promise.all(
      issueCreations.map(async (issueData) => {
        try {
          await octokit.rest.issues.create(issueData);
          Logger.info(`✅ Created issue: ${issueData.title}`);
          successCount++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          if (errorMessage.includes('Resource not accessible by integration')) {
            permissionErrors++;
            if (permissionErrors === 1) {
              // Only log the detailed permission error once
              Logger.error('❌ Permission Error: Cannot create issues. Please ensure:');
              Logger.error('1. The GITHUB_TOKEN has "issues: write" permission');
              Logger.error('2. In your workflow, add this to the job permissions:');
              Logger.error('   permissions:');
              Logger.error('     issues: write');
              Logger.error('     contents: read');
              Logger.error('   OR use a Personal Access Token with repo permissions');
            }
            Logger.debug(`Permission denied for issue: ${issueData.title}`);
          } else {
            otherErrors++;
            Logger.error(
              `❌ Failed to create issue: ${issueData.title} - ${errorMessage}`,
            );
          }
        }
      }),
    );

    // Summary of results
    Logger.info('📊 Issue Creation Summary:');
    Logger.info(`✅ Successfully created: ${successCount} issues`);
    if (permissionErrors > 0) {
      Logger.warning(
        `🔒 Permission denied: ${permissionErrors} issues (fix permissions to create these)`,
      );
    }
    if (otherErrors > 0) {
      Logger.error(`❌ Other errors: ${otherErrors} issues`);
    }

    const failures = permissionErrors + otherErrors;
    if (failures > 0) {
      Logger.setFailed(
        `Failed to create ${failures} of ${issueCreations.length} issues (${permissionErrors} permission error(s), ${otherErrors} other error(s)). See the errors above.`,
      );
    }
  }
}
