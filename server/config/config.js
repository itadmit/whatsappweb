module.exports = {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    maxClientsPerServer: process.env.MAX_CLIENTS || 10
  };