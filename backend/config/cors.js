function parseAllowedOrigins(value = '') {
  return value
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

function createCorsOptions(env = process.env) {
  const allowedOrigins = parseAllowedOrigins(env.CORS_ORIGIN || env.CORS_ORIGINS || '');

  if (allowedOrigins.length === 0) {
    return { origin: true };
  }

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
  };
}

module.exports = { createCorsOptions, parseAllowedOrigins };
