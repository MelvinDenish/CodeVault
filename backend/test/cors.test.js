const assert = require('node:assert/strict');
const test = require('node:test');
const { createCorsOptions, parseAllowedOrigins } = require('../config/cors');

test('parseAllowedOrigins accepts comma-separated origins and ignores blanks', () => {
  assert.deepEqual(
    parseAllowedOrigins('https://app.example.com, https://preview.vercel.app, ,'),
    ['https://app.example.com', 'https://preview.vercel.app']
  );
});

test('createCorsOptions allows configured origins and blocks unknown origins', () => {
  const options = createCorsOptions({ CORS_ORIGIN: 'https://app.example.com' });

  options.origin('https://app.example.com', (err, allowed) => {
    assert.ifError(err);
    assert.equal(allowed, true);
  });

  options.origin('https://unknown.example.com', (err) => {
    assert.match(err.message, /not allowed/i);
  });
});
