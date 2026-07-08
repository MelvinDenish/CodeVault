import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeApiBase, request } from '../src/api/client.js';

test('normalizeApiBase falls back to the Vite proxy path', () => {
  assert.equal(normalizeApiBase(), '/api');
});

test('normalizeApiBase trims trailing slashes from deployed API URLs', () => {
  assert.equal(normalizeApiBase('https://api.example.com/api/'), 'https://api.example.com/api');
});

test('request retries failed GET requests once', async () => {
  const originalFetch = globalThis.fetch;
  const originalLocalStorage = globalThis.localStorage;
  let calls = 0;

  globalThis.localStorage = { getItem: () => null };
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify(calls === 1 ? { error: 'temporary' } : { ok: true }), {
      status: calls === 1 ? 503 : 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    assert.deepEqual(await request('GET', '/health', null, { timeoutMs: 1000 }), { ok: true });
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalLocalStorage;
  }
});
