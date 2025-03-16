const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const webhookController = require('../controllers/webhookController');
const { authMiddleware } = require('../middlewares/auth');
const Connection = require('../models/Connection');
const MessageStats = require('../models/MessageStats');
const WhatsAppService = require('../services/whatsappService');
const typebotController = require('../controllers/typebotController');

// נתיב פשוט לבדיקת בריאות ללא אימות
router.get('/healthcheck', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// בדיקת תקינות
router.get('/typebot/test', (req, res) => {
  res.json({ success: true, message: 'Typebot API is working' });
});

// נתיבי WhatsApp - עם אימות משתמש
router.use(authMiddleware);

// נתיבים ספציפיים עם 'default' - חייבים להיות לפני הנתיבים עם משתנים
// הוסף נתיב ייעודי עבור "default"
router.get('/clients/default/typebot', async (req, res) => {
  try {
    // מצא את החיבור הראשון של המשתמש
    const userId = req.user._id;
    console.log('Finding connection for user:', userId);

    const connection = await Connection.findOne({ userId });
    
    if (!connection) {
      console.log('No connection found for user:', userId);
      return res.status(404).json({ success: false, error: 'לא נמצא חיבור למשתמש זה' });
    }
    
    console.log('Found connection:', connection._id);
    
    res.json({
      success: true,
      typebotEnabled: connection.typebotEnabled || false,
      typebotId: connection.typebotId || ''
    });
  } catch (error) {
    console.error('Get default typebot settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// אותו דבר לשמירת הגדרות
router.post('/clients/default/typebot', async (req, res) => {
  try {
    const userId = req.user._id;
    const { typebotEnabled, typebotId } = req.body;
    
    console.log('Saving typebot settings for user:', userId);
    console.log('Settings:', { typebotEnabled, typebotId });
    
    // מצא את החיבור הראשון או צור חדש אם אין
    let connection = await Connection.findOne({ userId });
    
    if (!connection) {
      console.log('Creating new connection for user:', userId);
      connection = new Connection({
        userId,
        status: 'not_initialized'
      });
    } else {
      console.log('Found existing connection:', connection._id);
    }
    
    // עדכן הגדרות
    connection.typebotEnabled = typebotEnabled;
    connection.typebotId = typebotId;
    
    await connection.save();
    
    res.json({ 
      success: true, 
      message: 'הגדרות הצ\'אטבוט נשמרו בהצלחה' 
    });
  } catch (error) {
    console.error('Save default typebot settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// נתיבי יצירת חיבור ואתחול
router.post('/clients/ensure-connection', async (req, res) => {
  try {
    const userId = req.user._id;
    
    // בדוק אם יש כבר חיבור
    let connection = await Connection.findOne({ userId });
    
    // אם אין, צור חדש
    if (!connection) {
      connection = new Connection({
        userId,
        status: 'not_initialized'
      });
      await connection.save();
      console.log('Created new connection for user:', userId);
    }
    
    res.json({ 
      success: true, 
      connectionId: connection._id.toString(),
      status: connection.status
    });
  } catch (error) {
    console.error('Error ensuring connection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/clients/init-connection', async (req, res) => {
  try {
    const userId = req.user._id;
    
    // בדוק אם כבר יש חיבור
    let connection = await Connection.findOne({ userId });
    
    // אם אין, צור חדש
    if (!connection) {
      connection = new Connection({
        userId,
        status: 'not_initialized',
        typebotEnabled: false
      });
      await connection.save();
    }
    
    res.json({
      success: true,
      connectionId: connection._id.toString(),
      status: connection.status,
      typebotEnabled: connection.typebotEnabled,
      typebotId: connection.typebotId
    });
  } catch (error) {
    console.error('Init connection error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// נתיבים גנריים
router.get('/clients/:clientId/init', whatsappController.initializeClient);
router.get('/clients/:clientId/qr', whatsappController.getQR);
router.post('/clients/:clientId/messages', whatsappController.sendMessage);
router.get('/clients/:clientId/status', whatsappController.getStatus);
router.delete('/clients/:clientId', whatsappController.disconnectClient);

// נתיבי typebot
router.post('/typebot/relay', typebotController.relayToTypebot);
router.post('/typebot/test-connection', typebotController.testTypebotConnection);

// נתיבים גנריים - אלה חייבים להיות אחרי הנתיבים עם 'default'
router.get('/clients/:clientId/typebot', typebotController.getTypebotSettings);
router.post('/clients/:clientId/typebot', typebotController.saveTypebotSettings);

// נתיבי Webhook
router.post('/clients/:clientId/webhook', webhookController.setWebhook);
router.get('/clients/:clientId/webhook', webhookController.getWebhook);

// נתיבים לקבלת סטטיסטיקות ומידע
router.get('/user/statistics', whatsappController.getUserStatistics);

// נתיב פשוט לשליחת הודעה עם API Key
router.post('/send-message', async (req, res) => {
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
});

module.exports = router;