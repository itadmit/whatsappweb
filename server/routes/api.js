const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const webhookController = require('../controllers/webhookController');
const { authMiddleware } = require('../middlewares/auth');
const Connection = require('../models/Connection');
const MessageStats = require('../models/MessageStats');
const WhatsAppService = require('../services/whatsappService');

// נתיבי WhatsApp - עם אימות משתמש
router.use(authMiddleware);

router.get('/clients/:clientId/init', whatsappController.initializeClient);
router.get('/clients/:clientId/qr', whatsappController.getQR);
router.post('/clients/:clientId/messages', whatsappController.sendMessage);
router.get('/clients/:clientId/status', whatsappController.getStatus);
router.delete('/clients/:clientId', whatsappController.disconnectClient);

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