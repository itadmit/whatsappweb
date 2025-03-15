const mongoose = require('mongoose');

const ConnectionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['not_initialized', 'initializing', 'qr_ready', 'connected', 'disconnected', 'error'],
    default: 'not_initialized'
  },
  webhookUrl: {
    type: String,
    default: null
  },
  lastConnected: {
    type: Date,
    default: null
  },
  // השדות החדשים להגדרות typebot
  typebotEnabled: {
    type: Boolean,
    default: false
  },
  typebotId: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Connection', ConnectionSchema);