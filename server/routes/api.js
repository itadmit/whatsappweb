const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const webhookController = require('../controllers/webhookController');

// נתיבי WhatsApp
router.get('/clients/:clientId/init', whatsappController.initializeClient);
router.get('/clients/:clientId/qr', whatsappController.getQR);
router.post('/clients/:clientId/messages', whatsappController.sendMessage);
router.get('/clients/:clientId/status', whatsappController.getStatus);
router.delete('/clients/:clientId', whatsappController.disconnectClient);

// נתיבי Webhook
router.post('/clients/:clientId/webhook', webhookController.setWebhook);

module.exports = router;