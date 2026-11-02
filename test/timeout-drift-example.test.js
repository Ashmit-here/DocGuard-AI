import assert from 'node:assert/strict';
import test from 'node:test';
import { runExample } from '../examples/timeout-drift/run.mjs';

test('timeout drift example matches the deterministic engine output and exact evidence', async () => {
  const { result, expectedOutput } = await runExample();

  assert.deepEqual(result, expectedOutput);
  assert.equal(result.contract, 'drift-engine/v1');
  assert.equal(result.findings.length, 1);
  assert.deepEqual(result.findings[0], {
    id: 'rule-1',
    outdated: true,
    documentation: {
      file: 'README.md',
      line: 3,
      sentence: 'The request timeout is 20 seconds.',
    },
    codeEvidence: {
      file: 'src/config.js',
      line: 1,
      changeType: 'added',
      text: 'export const REQUEST_TIMEOUT_SECONDS = 30;',
    },
    reason: 'The documented timeout is 20 seconds, but REQUEST_TIMEOUT_SECONDS changed from 20 to 30 seconds.',
    verification: 'deterministic-rule-match',
  });
  assert.equal(result.findings.some((finding) => finding.documentation.file === 'docs/operations.md'), false);
  assert.equal(result.suggestions.length, 0);
  assert.equal(result.diagnostics.model.status, 'not-run-deterministic-only');
});
