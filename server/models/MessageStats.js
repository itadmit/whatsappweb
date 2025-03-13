const mongoose = require('mongoose');

const MessageStatsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  connectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Connection',
    required: true
  },
  messagesSent: {
    type: Number,
    default: 0
  },
  messagesReceived: {
    type: Number,
    default: 0
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('MessageStats', MessageStatsSchema);