const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// שמירת מופעי לקוחות לפי מזהה
const clients = {};
// שמירת נתוני QR
const qrCodes = {};
// שמירת כתובות webhook
const webhooks = {};

class WhatsAppService {
  // יצירת חיבור חדש
  static async createClient(clientId) {
    if (clients[clientId]) {
      return {
        status: clients[clientId].status,
        message: 'Client already exists'
      };
    }

    // הכנת מסלול לשמירת נתוני סשן
    const sessionDir = path.join(__dirname, '../../sessions');
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const sessionFile = path.join(sessionDir, `${clientId}.json`);
    const sessionExists = fs.existsSync(sessionFile);

    // הגדרות לקוח
    const clientOptions = {
      puppeteer: {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ],
        headless: true
      }
    };

    // ניסיון לטעון סשן קיים
    if (sessionExists) {
      try {
        const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
        clientOptions.session = sessionData;
      } catch (error) {
        console.error('Error loading session:', error);
      }
    }

    // יצירת חיבור חדש
    const client = new Client(clientOptions);
    clients[clientId] = {
      client,
      status: 'initializing'
    };

    // האזנה לאירועים
    client.on('qr', (qr) => {
      qrCodes[clientId] = qr;
      clients[clientId].status = 'qr_ready';
      console.log(`QR code generated for client ${clientId}`);
    });

    client.on('ready', () => {
      clients[clientId].status = 'connected';
      console.log(`Client ${clientId} is ready`);
      
      // שמירת נתוני סשן
      if (client.pupPage) {
        client.pupPage.evaluate(() => {
          return localStorage.getItem('WABrowserId');
        }).then(browserID => {
          if (browserID) {
            client.getState().then(state => {
              fs.writeFileSync(sessionFile, JSON.stringify(state));
              console.log(`Session saved for client ${clientId}`);
            });
          }
        });
      }
    });

    // טיפול בהודעות נכנסות
    client.on('message', async (message) => {
      console.log(`Message received for client ${clientId}: ${message.body}`);
      
      try {
        // שליחה לוובהוק אם מוגדר
        if (webhooks[clientId]) {
          try {
            const messageData = {
              event: 'message',
              timestamp: Date.now(),
              client_id: clientId,
              message_id: message.id.id,
              from: message.from.split('@')[0],
              to: message.to ? message.to.split('@')[0] : 'me',
              content: {
                type: 'text',
                text: message.body
              }
            };
            
            await axios.post(webhooks[clientId], messageData);
            console.log(`Webhook sent for client ${clientId}`);
          } catch (webhookError) {
            console.error(`Error sending webhook for client ${clientId}:`, webhookError.message);
          }
        }
        
        // עדכון סטטיסטיקות הודעות ושליחה לצ'אטבוט
        try {
          const MessageStats = require('../models/MessageStats');
          const Connection = require('../models/Connection');
          
          const connection = await Connection.findById(clientId);
          if (connection) {
            // בדיקה אם צ'אטבוט מופעל
            if (connection.typebotEnabled && connection.typebotId) {
              try {
                console.log(`Typebot is enabled for client ${clientId}, sending message to typebot relay`);
                
                // יצירת המטען לשליחה לצ'אטבוט
                const typebotPayload = {
                  from: message.from,
                  message: message.body,
                  clientId: clientId
                };
                
                // הגדרת טוקן API
                const TYPEBOT_API_TOKEN = 'internal_auth_token';
                
                // קריאה לשירות הצ'אטבוט - שימוש בURL מלא
                const typebotRelayUrl = `http://${process.env.HOST || 'localhost'}:${process.env.PORT || '3000'}/api/typebot/relay`;
                console.log(`Sending message to typebot relay URL: ${typebotRelayUrl}`);
                
                const typebotResponse = await axios.post(
                  typebotRelayUrl,
                  typebotPayload,
                  {
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${TYPEBOT_API_TOKEN}`
                    }
                  }
                );
                
                console.log(`Message relayed to typebot, response:`, typebotResponse.data);
              } catch (typebotError) {
                console.error(`Error relaying to typebot for client ${clientId}:`, typebotError.message);
                // שגיאה מפורטת יותר לצורך דיבאג
                if (typebotError.response) {
                  console.error(`Typebot error response:`, {
                    status: typebotError.response.status,
                    data: typebotError.response.data
                  });
                }
              }
            } else {
              console.log(`Typebot is not enabled for client ${clientId}`);
            }
            
            // עדכון סטטיסטיקות
            await MessageStats.updateOne(
              { userId: connection.userId, connectionId: connection._id },
              { $inc: { messagesReceived: 1 } },
              { upsert: true }
            );
          } else {
            console.log(`No connection found for client ${clientId}`);
          }
        } catch (statsError) {
          console.error(`Error updating message statistics for client ${clientId}:`, statsError.message);
        }
      } catch (error) {
        console.error(`Error processing incoming message for client ${clientId}:`, error.message);
      }
    });

    client.on('disconnected', () => {
      clients[clientId].status = 'disconnected';
      console.log(`Client ${clientId} disconnected`);
    });

    // אתחול החיבור
    try {
      await client.initialize();
      return {
        status: 'initializing',
        message: 'WhatsApp client initializing'
      };
    } catch (error) {
      console.error(`Error initializing client ${clientId}:`, error);
      clients[clientId].status = 'error';
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  // קבלת QR
  static async getQR(clientId) {
    if (!clients[clientId]) {
      throw new Error('Client not found');
    }

    if (!qrCodes[clientId]) {
      throw new Error('QR code not generated yet');
    }

    // המרת קוד QR לתמונה
    try {
      const qrCodeImage = await qrcode.toDataURL(qrCodes[clientId]);
      return {
        qrCode: qrCodeImage,
        status: clients[clientId].status
      };
    } catch (error) {
      throw new Error('Failed to generate QR image');
    }
  }

  // שליחת הודעה
  static async sendMessage(clientId, phone, message) {
    if (!clients[clientId] || clients[clientId].status !== 'connected') {
      throw new Error('WhatsApp client not connected');
    }

    try {
      // וידוא מספר הטלפון בפורמט הנכון
      const formattedPhone = phone.includes('@c.us') 
        ? phone 
        : `${phone.replace(/[^\d]/g, '')}@c.us`;
      
      console.log(`Sending message to ${formattedPhone}`);
      
      // שליחת ההודעה
      const result = await clients[clientId].client.sendMessage(formattedPhone, message);
      
      console.log(`Message sent successfully to ${formattedPhone}`);
      
      return {
        success: true,
        messageId: result.id.id
      };
    } catch (error) {
      console.error(`Error sending message for client ${clientId}:`, error);
      throw error;
    }
  }

  // הגדרת וובהוק
  static setWebhook(clientId, url) {
    if (!clients[clientId]) {
      throw new Error('Client not found');
    }

    webhooks[clientId] = url;
    return {
      success: true,
      webhookUrl: url
    };
  }

  // קבלת סטטוס
  static getStatus(clientId) {
    if (!clients[clientId]) {
      return { status: 'not_initialized', connected: false };
    }

    return {
      status: clients[clientId].status,
      connected: clients[clientId].status === 'connected'
    };
  }

  // ניתוק חיבור
  static async disconnectClient(clientId) {
    if (!clients[clientId]) {
      throw new Error('Client not found');
    }

    try {
      await clients[clientId].client.destroy();
      delete clients[clientId];
      delete qrCodes[clientId];
      delete webhooks[clientId];

      return {
        success: true,
        message: 'Client disconnected successfully'
      };
    } catch (error) {
      console.error(`Error disconnecting client ${clientId}:`, error);
      throw error;
    }
  }
}

module.exports = WhatsAppService;