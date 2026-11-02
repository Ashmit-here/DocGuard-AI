import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareProjectSuggestions } from '../src/services/analyser-response-validator.js';

test('repository model output stays unverified and only keeps references grounded in input', () => {
  const analysis = {
    summary: 'A possible mismatch was found.',
    findings: [{
      severity: 'medium',
      title: 'Possible stale timeout',
      explanation: 'The values may differ.',
      sourceReferences: [
        { path: 'src/config.js', startLine: 2, endLine: 3 },
        { path: 'src/config.js', startLine: 99, endLine: 99 },
        { path: 'src/typo.js', startLine: 1, endLine: 1 },
      ],
      documentationReferences: [
        { path: 'docs/guide.pdf', pageNumber: 2, quote: 'timeout is 20 seconds' },
        { path: 'docs/guide.pdf', pageNumber: 8, quote: 'timeout is 20 seconds' },
        { path: 'docs/guide.pdf', pageNumber: 2, quote: 'invented quote' },
        { path: 'docs/typo.pdf', pageNumber: 2, quote: 'timeout is 20 seconds' },
      ],
      recommendation: 'Review the documentation.',
    }],
  };
  const project = {
    project: {
      sourceFiles: [{ path: 'src/config.js', content: 'export const timeout = 30;\nexport const retry = 2;\n' }],
      documentation: [{
        path: 'docs/guide.pdf',
        extractedText: 'timeout is 20 seconds\npage two',
        pages: [
          { pageNumber: 1, text: 'cover' },
          { pageNumber: 2, text: 'The timeout is 20 seconds.' },
        ],
      }],
    },
  };

  const result = prepareProjectSuggestions(analysis, project);
  assert.equal(result.verification, 'unverified-model-output');
  assert.deepEqual(result.findings, []);
  assert.equal(result.suggestions.length, 1);
  assert.equal(result.suggestions[0].verification, 'unverified-model-suggestion');
  assert.deepEqual(result.suggestions[0].sourceReferences, [
    { path: 'src/config.js', startLine: 2, endLine: 3 },
  ]);
  assert.deepEqual(result.suggestions[0].documentationReferences, [
    { path: 'docs/guide.pdf', pageNumber: 2, quote: 'timeout is 20 seconds' },
  ]);
});
