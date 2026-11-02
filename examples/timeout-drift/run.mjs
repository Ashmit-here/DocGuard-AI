import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze } from '../../drift-engine.js';

const exampleDirectory = dirname(fileURLToPath(import.meta.url));

async function readFixture(relativePath) {
  return readFile(join(exampleDirectory, relativePath), 'utf8');
}

export async function runExample() {
  const [originalCode, updatedCode, readme, operations, diff, expectedOutput] = await Promise.all([
    readFixture('before/src/config.js'),
    readFixture('after/src/config.js'),
    readFixture('README.md'),
    readFixture('docs/operations.md'),
    readFixture('changes.diff'),
    readFixture('expected-output.json'),
  ]);
  const result = await analyze({
    diff,
    docs: [
      { file: 'README.md', content: readme },
      { file: 'docs/operations.md', content: operations },
    ],
    originalCode,
    updatedCode,
    codeFile: 'src/config.js',
    skipModel: true,
  });

  return { result, expectedOutput: JSON.parse(expectedOutput) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { result, expectedOutput } = await runExample();
  assert.deepStrictEqual(result, expectedOutput, 'Actual deterministic result differs from expected-output.json');
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
