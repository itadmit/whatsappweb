const WhatsAppService = require('../services/whatsappService');
const Connection = require('../models/Connection');
const MessageStats = require('../models/MessageStats');

// אתחול לקוח חדש
exports.initializeClient = async (req, res) => {
  try {
    const userId = req.user._id;
    // בדיקה אם כבר יש חיבור למשתמש זה
    let connection = await Connection.findOne({ userId });
    
    if (!connection) {
      // יצירת רשומת חיבור חדשה אם לא קיימת
      connection = new Connection({
        userId,
        status: 'not_initialized'
      });
      await connection.save();
    }
    
    const clientId = connection._id.toString();
    
    // אתחול הלקוח דרך השירות של WhatsApp
    const result = await WhatsAppService.createClient(clientId);
    
    // עדכון סטטוס החיבור
    connection.status = result.status;
    if (result.status === 'initializing' || result.status === 'qr_ready') {
      // אם מצליח להתחיל אתחול, עדכן את הסטטוס
      await connection.save();
    }
    
    res.json(result);
  } catch (error) {
    console.error('Initialize client error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// קבלת קוד QR
exports.getQR = async (req, res) => {
  try {
    const userId = req.user._id;
    const connection = await Connection.findOne({ userId });
    
    if (!connection) {
      return res.status(404).json({ success: false, error: 'לא נמצא חיבור' });
    }
    
    const clientId = connection._id.toString();
    
    // קבלת קוד QR מהשירות
    const result = await WhatsAppService.getQR(clientId);
    
    res.json(result);
  } catch (error) {
    console.error('Get QR error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// שליחת הודעה
exports.sendMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ success: false, error: 'מספר טלפון והודעה הם שדות חובה' });
    }
    
    const connection = await Connection.findOne({ userId });
    
    if (!connection) {
      return res.status(404).json({ success: false, error: 'לא נמצא חיבור' });
    }
    
    const clientId = connection._id.toString();
    
    // בדיקת סטטוס החיבור
    if (connection.status !== 'connected') {
      return res.status(400).json({ 
        success: false, 
        error: 'יש להתחבר לוואטסאפ תחילה',
        status: connection.status
      });
    }
    
    // שליחת ההודעה דרך השירות
    const result = await WhatsAppService.sendMessage(clientId, phone, message);
    
    // עדכון סטטיסטיקות
    await MessageStats.updateOne(
      { userId, connectionId: connection._id },
      { $inc: { messagesSent: 1 } },
      { upsert: true }
    );
    
    res.json(result);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// קבלת סטטוס החיבור
exports.getStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // בדיקה אם קיים חיבור למשתמש זה
    const connection = await Connection.findOne({ userId });
    
    if (!connection) {
      return res.json({ status: 'not_initialized', connected: false });
    }
    
    const clientId = connection._id.toString();
    
    // קבלת הסטטוס מהשירות
    const status = WhatsAppService.getStatus(clientId);
    
    // עדכון הסטטוס בבסיס הנתונים אם הוא שונה
    if (status.status !== connection.status) {
      connection.status = status.status;
      if (status.status === 'connected') {
        connection.lastConnected = new Date();
      }
      await connection.save();
    }
    
    res.json(status);
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ניתוק החיבור
exports.disconnectClient = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // בדיקה אם קיים חיבור
    const connection = await Connection.findOne({ userId });
    
    if (!connection) {
      return res.status(404).json({ success: false, error: 'לא נמצא חיבור' });
    }
    
    const clientId = connection._id.toString();
    
    // ניתוק החיבור דרך השירות
    const result = await WhatsAppService.disconnectClient(clientId);
    
    // עדכון הסטטוס בבסיס הנתונים
    connection.status = 'disconnected';
    await connection.save();
    
    res.json(result);
  } catch (error) {
    console.error('Disconnect client error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// קבלת סטטיסטיקות משתמש
exports.getUserStatistics = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // קבלת נתוני החיבור
    const connection = await Connection.findOne({ userId });
    
    // קבלת סטטיסטיקות הודעות
    const stats = await MessageStats.findOne({ userId });
    
    res.json({
      success: true,
      stats: {
        activeConnections: connection && connection.status === 'connected' ? 1 : 0,
        messagesSent: stats ? stats.messagesSent : 0,
        messagesReceived: stats ? stats.messagesReceived : 0,
        lastConnected: connection ? connection.lastConnected : null
      }
    });
  } catch (error) {
    console.error('Get user statistics error:', error);
    res.status(500).json({ success: false, error: 'שגיאה בטעינת סטטיסטיקות' });
  }
};