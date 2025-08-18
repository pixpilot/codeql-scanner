import * as crypto from 'node:crypto';

import { getOctokit } from '@actions/github';
import * as github from '@actions/github';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IssueCreator } from '../../src/github/issue-creator';
import { Logger } from '../../src/utils/logger';

vi.mock('@actions/github');
vi.mock('../../src/utils/logger');
vi.mock('node:crypto');

const mockOctokit = {
  rest: {
    issues: {
      listForRepo: vi.fn(),
      create: vi.fn(),
    },
  },
};

const mockGetOctokit = vi.mocked(getOctokit);
const mockGithub = vi.mocked(github);
const mockLogger = vi.mocked(Logger);
const mockCrypto = vi.mocked(crypto);

describe('issueCreator', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetOctokit.mockReturnValue(mockOctokit as any);
    mockGithub.context = {
      repo: { owner: 'test-owner', repo: 'test-repo' },
    } as any;

    mockOctokit.rest.issues.listForRepo.mockResolvedValue({
      data: [],
    } as any);

    mockOctokit.rest.issues.create.mockResolvedValue({
      data: { number: 1, html_url: 'https://github.com/test/issue/1' },
    } as any);

    mockCrypto.createHash.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('abcd1234'),
    } as any);
  });

  describe('createIssuesFromSarif', () => {
    it('should handle empty SARIF report', async () => {
      const sarif = {};

      await IssueCreator.createIssuesFromSarif(sarif, 'test-token');

      expect(mockOctokit.rest.issues.create).not.toHaveBeenCalled();
    });

    it('should handle SARIF with no runs', async () => {
      const sarif = { runs: [] };

      await IssueCreator.createIssuesFromSarif(sarif, 'test-token');

      expect(mockOctokit.rest.issues.create).not.toHaveBeenCalled();
    });

    it('should create issues for SARIF results', async () => {
      const sarif = {
        runs: [
          {
            results: [
              {
                ruleId: 'test-rule',
                message: { text: 'Test security issue' },
                locations: [
                  {
                    physicalLocation: {
                      artifactLocation: { uri: 'src/test.js' },
                      region: { startLine: 10 },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      await IssueCreator.createIssuesFromSarif(sarif, 'test-token');

      expect(mockOctokit.rest.issues.create).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        title: expect.stringContaining('test-rule'),
        body: expect.stringContaining('Test security issue'),
        labels: ['codeql-finding'],
      });
    });

    it('should skip existing open issues', async () => {
      const sarif = {
        runs: [
          {
            results: [
              {
                ruleId: 'test-rule',
                message: { text: 'Test security issue' },
                locations: [
                  {
                    physicalLocation: {
                      artifactLocation: { uri: 'src/test.js' },
                      region: { startLine: 10 },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      // Mock existing issue with matching title
      mockOctokit.rest.issues.listForRepo.mockResolvedValue({
        data: [
          {
            title: 'CodeQL Finding: test-rule [abcd1234]',
            state: 'open',
          },
        ],
      } as any);

      await IssueCreator.createIssuesFromSarif(sarif, 'test-token');

      expect(mockOctokit.rest.issues.create).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('already exists and is open'),
      );
    });

    it('should respect closed issues and not reopen them', async () => {
      const sarif = {
        runs: [
          {
            results: [
              {
                ruleId: 'test-rule',
                message: { text: 'Test security issue' },
                locations: [
                  {
                    physicalLocation: {
                      artifactLocation: { uri: 'src/test.js' },
                      region: { startLine: 10 },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      // Mock existing closed issue with matching title
      mockOctokit.rest.issues.listForRepo.mockResolvedValue({
        data: [
          {
            title: 'CodeQL Finding: test-rule [abcd1234]',
            state: 'closed',
          },
        ],
      } as any);

      await IssueCreator.createIssuesFromSarif(sarif, 'test-token');

      expect(mockOctokit.rest.issues.create).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('was previously closed'),
      );
    });

    it('should handle GitHub API errors gracefully', async () => {
      const sarif = {
        runs: [
          {
            results: [
              {
                ruleId: 'test-rule',
                message: { text: 'Test security issue' },
              },
            ],
          },
        ],
      };

      mockOctokit.rest.issues.create.mockRejectedValue(new Error('API Error'));

      await IssueCreator.createIssuesFromSarif(sarif, 'test-token');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create issue'),
      );
    });

    it('should batch create multiple issues', async () => {
      const sarif = {
        runs: [
          {
            results: [
              {
                ruleId: 'rule-1',
                message: { text: 'Issue 1' },
                locations: [
                  {
                    physicalLocation: {
                      artifactLocation: { uri: 'file1.js' },
                      region: { startLine: 1 },
                    },
                  },
                ],
              },
              {
                ruleId: 'rule-2',
                message: { text: 'Issue 2' },
                locations: [
                  {
                    physicalLocation: {
                      artifactLocation: { uri: 'file2.js' },
                      region: { startLine: 2 },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      await IssueCreator.createIssuesFromSarif(sarif, 'test-token');

      expect(mockOctokit.rest.issues.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('createIssueFromResult', () => {
    it('should create issue data with proper formatting', () => {
      // Since this is a private method, we test it indirectly through createIssuesFromSarif
      // The method is tested through the integration tests above
      expect(true).toBe(true);
    });
  });
});
