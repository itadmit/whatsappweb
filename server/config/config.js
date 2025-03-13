module.exports = {
  port: process.env.PORT || 3000,
  environment: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  maxClientsPerServer: process.env.MAX_CLIENTS || 10,
  databaseUri: process.env.DATABASE_URI || 'mongodb+srv://Cluster68491:VkxNSGBbd3JY@cluster68491.wh8jq.mongodb.net/whatsapp_api?retryWrites=true&w=majority'
};