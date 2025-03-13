// server.js
const express = require('express');
const cors = require('cors');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// משתנה גלובלי לשמירת לקוח וואטסאפ
let whatsappClient = null;
let qrCodeData = null;
let connectionStatus = 'disconnected';

// נקודת קצה לאתחול חיבור וואטסאפ
app.get('/api/init-whatsapp', (req, res) => {
  if (whatsappClient) {
    return res.json({ 
      status: connectionStatus,
      message: 'WhatsApp client already initialized' 
    });
  }
  
  // יצירת לקוח וואטסאפ חדש
  whatsappClient = new Client();
  
  // האזנה לאירוע יצירת QR
  whatsappClient.on('qr', (qr) => {
    qrCodeData = qr;
    connectionStatus = 'qr_ready';
    console.log('QR Code generated');
  });
  
  // האזנה לאירוע התחברות
  whatsappClient.on('ready', () => {
    connectionStatus = 'connected';
    console.log('WhatsApp client is ready!');
  });
  
  // האזנה להודעות נכנסות
  whatsappClient.on('message', (message) => {
    console.log(`Message received: ${message.body}`);
    // כאן תוכל להוסיף לוגיקה להעברת ההודעה לוובהוק
  });
  
  // אתחול הלקוח
  whatsappClient.initialize();
  
  res.json({ 
    status: 'initializing',
    message: 'WhatsApp client is initializing' 
  });
});

// נקודת קצה לקבלת QR
app.get('/api/get-qr', (req, res) => {
  if (!qrCodeData) {
    return res.status(404).json({ 
      error: 'QR code not generated yet' 
    });
  }
  
  res.json({ 
    qrCode: qrCodeData,
    status: connectionStatus 
  });
});

// נקודת קצה לשליחת הודעת טקסט
app.post('/api/send-message', async (req, res) => {
  const { phone, message } = req.body;
  
  if (!whatsappClient || connectionStatus !== 'connected') {
    return res.status(400).json({ 
      error: 'WhatsApp client not connected' 
    });
  }
  
  if (!phone || !message) {
    return res.status(400).json({ 
      error: 'Phone number and message are required' 
    });
  }
  
  try {
    // וידוא מספר הטלפון בפורמט הנכון
    const formattedPhone = phone.includes('@c.us') 
      ? phone 
      : `${phone.replace(/[^\d]/g, '')}@c.us`;
    
    // שליחת ההודעה
    const result = await whatsappClient.sendMessage(formattedPhone, message);
    
    res.json({ 
      success: true, 
      messageId: result.id.id 
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message 
    });
  }
});

// נקודת קצה לקבלת סטטוס החיבור
app.get('/api/status', (req, res) => {
  res.json({ 
    status: connectionStatus,
    connected: connectionStatus === 'connected' 
  });
});

// הפעלת השרת
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// משתנה לשמירת כתובת הוובהוק
let webhookUrl = null;

// נקודת קצה להגדרת כתובת וובהוק
app.post('/api/set-webhook', (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'Webhook URL is required' });
  }
  
  webhookUrl = url;
  res.json({ success: true, webhookUrl });
});

// עדכון הטיפול בהודעות נכנסות
whatsappClient.on('message', async (message) => {
  console.log(`Message received: ${message.body}`);
  
  // אם יש כתובת וובהוק מוגדרת, שלח אליה את ההודעה
  if (webhookUrl) {
    try {
      const messageData = {
        event: 'message',
        timestamp: Date.now(),
        message_id: message.id.id,
        from: message.from.split('@')[0],
        to: message.to ? message.to.split('@')[0] : 'me',
        content: {
          type: 'text',
          text: message.body
        }
      };
      
      await axios.post(webhookUrl, messageData);
    } catch (error) {
      console.error('Error sending webhook', error.message);
    }
  }
});