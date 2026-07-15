import type { CodeQLResult } from '../../../src/types';

import { describe, expect, it } from 'vitest';

import {
  formatIssueBody,
  ISSUE_BODY_LIMIT,
} from '../../../src/github/utils/format-issue-body';

function makeResult(overrides: Partial<CodeQLResult> = {}): CodeQLResult {
  return {
    ruleId: 'js/file-access-to-http',
    message: { text: 'Sensitive file access over HTTP' },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: 'src/test.js' },
          region: { startLine: 10 },
        },
      },
    ],
    ...overrides,
  };
}

function makeCodeFlows(count: number): unknown[] {
  return Array.from({ length: count }, (_, index) => ({
    threadFlows: [
      {
        locations: Array.from({ length: 20 }, () => ({
          location: {
            physicalLocation: {
              artifactLocation: { uri: `src/very/long/path/to/file-${index}.js` },
              region: { startLine: index, snippet: { text: 'x'.repeat(200) } },
            },
            message: { text: 'y'.repeat(200) },
          },
        })),
      },
    ],
  }));
}

describe('formatIssueBody', () => {
  it('includes the message, locations and full SARIF json for a small finding', () => {
    const body = formatIssueBody(makeResult(), 'abcd1234');

    expect(body).toContain('Sensitive file access over HTTP');
    expect(body).toContain('src/test.js');
    expect(body).toContain('abcd1234');
    expect(body).toContain('```json');
    expect(body).toContain('js/file-access-to-http');
  });

  it('reports when a finding has no locations', () => {
    const body = formatIssueBody(makeResult({ locations: [] }), 'abcd1234');

    expect(body).toContain('_No locations reported._');
  });

  it('caps the locations list and says how many were omitted', () => {
    const locations = Array.from({ length: 60 }, (_, index) => ({
      physicalLocation: {
        artifactLocation: { uri: `src/file-${index}.js` },
        region: { startLine: index },
      },
    }));

    const body = formatIssueBody(makeResult({ locations }), 'abcd1234');
    // The raw SARIF json still holds every location, so only assert on the rendered list.
    const locationsList = body.slice(
      body.indexOf('### Vulnerability Locations'),
      body.indexOf('<details>'),
    );

    expect(locationsList).toContain('**File:** `src/file-49.js`');
    expect(locationsList).not.toContain('**File:** `src/file-50.js`');
    expect(locationsList).toContain('and 10 more location(s)');
  });

  it('truncates an oversized message', () => {
    const body = formatIssueBody(
      makeResult({ message: { text: 'a'.repeat(10000) } }),
      'abcd1234',
    );

    expect(body).toContain('… (message truncated)');
    expect(body.length).toBeLessThanOrEqual(ISSUE_BODY_LIMIT);
  });

  it('drops code flows instead of the rest of the finding when the json is too large', () => {
    const codeFlows = makeCodeFlows(30);
    const body = formatIssueBody(makeResult({ codeFlows }), 'abcd1234');

    expect(body.length).toBeLessThanOrEqual(ISSUE_BODY_LIMIT);
    expect(body).toContain('codeFlows (30 entries)');
    expect(body).toContain("Trimmed to fit GitHub's issue size limit");
    // The useful parts survive.
    expect(body).toContain('Sensitive file access over HTTP');
    expect(body).toContain('js/file-access-to-http');
    expect(body).toContain('src/test.js');
  });

  it('stays within the limit when even the trimmed json is too large', () => {
    const result = makeResult({
      codeFlows: makeCodeFlows(5),
      relatedLocations: makeCodeFlows(200),
      partialFingerprints: { primary: 'z'.repeat(70000) },
    });

    const body = formatIssueBody(result, 'abcd1234');

    expect(body.length).toBeLessThanOrEqual(ISSUE_BODY_LIMIT);
    expect(body).toContain("Truncated to fit GitHub's issue size limit");
  });

  it('keeps the body under the limit when the locations alone consume the budget', () => {
    const locations = Array.from({ length: 50 }, () => ({
      physicalLocation: {
        artifactLocation: { uri: `src/${'deep/'.repeat(200)}file.js` },
        region: { startLine: 1 },
      },
    }));

    const body = formatIssueBody(
      makeResult({ locations, codeFlows: makeCodeFlows(50) }),
      'abcd1234',
    );

    expect(body.length).toBeLessThanOrEqual(ISSUE_BODY_LIMIT);
  });
});
