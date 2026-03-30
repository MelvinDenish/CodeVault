module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'codevault_super_secret_key_2024',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptSaltRounds: 12
};
