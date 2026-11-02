import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';
import { readJsonBody } from '../src/utils/read-json-body.js';

function createRequest(body) {
  const request = Readable.from([body]);
  request.headers = {
    'content-type': 'application/json',
    'content-length': String(body.length),
  };
  return request;
}

test('accepts JSON bodies just below and exactly at the configured byte limit', async () => {
  const exactBody = Buffer.from('{"x":1} ');
  const belowBody = exactBody.subarray(0, exactBody.length - 1);
  assert.deepEqual(await readJsonBody(createRequest(belowBody), {
    maxRequestBytes: exactBody.length,
  }), { x: 1 });
  assert.deepEqual(await readJsonBody(createRequest(exactBody), {
    maxRequestBytes: exactBody.length,
  }), { x: 1 });
});

test('rejects JSON bodies above the configured byte limit with a clear 413 error', async () => {
  const body = Buffer.from('{"x":1}  ');
  await assert.rejects(readJsonBody(createRequest(body), {
    maxRequestBytes: body.length - 1,
  }), (error) => error.statusCode === 413
    && error.code === 'REQUEST_TOO_LARGE'
    && error.message.includes(`${body.length - 1}-byte`));
});
