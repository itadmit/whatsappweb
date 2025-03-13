const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'super_admin'],
    default: 'user'
  },
  plan: {
    type: String,
    enum: ['basic', 'pro', 'platinum'],
    default: 'basic'
  },
  apiKey: {
    type: String,
    unique: true
  },
  active: {
    type: Boolean,
    default: true
  },
  acceptedTerms: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// מתודה להשוואת סיסמאות
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// לפני שמירה - הצפנת סיסמה וייצור מפתח API
UserSchema.pre('save', async function(next) {
  // הצפנת סיסמה רק אם היא השתנתה
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  
  // יצירת מפתח API אם לא קיים
  if (!this.apiKey) {
    this.apiKey = require('crypto').randomBytes(32).toString('hex');
  }
  
  next();
});

module.exports = mongoose.model('User', UserSchema);