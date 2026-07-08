import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeApiBase } from '../src/api/client.js';

test('normalizeApiBase falls back to the Vite proxy path', () => {
  assert.equal(normalizeApiBase(), '/api');
});

test('normalizeApiBase trims trailing slashes from deployed API URLs', () => {
  assert.equal(normalizeApiBase('https://api.example.com/api/'), 'https://api.example.com/api');
});
