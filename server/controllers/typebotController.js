const axios = require('axios');
const Connection = require('../models/Connection');
const WhatsAppService = require('../services/whatsappService');

// Updated Typebot configuration
const TYPEBOT_API_URL = process.env.TYPEBOT_API_URL || 'http://localhost:8081/api/v1';
const TYPEBOT_API_TOKEN = process.env.TYPEBOT_API_TOKEN || 'internal_auth_token';

/**
 * Relay messages from WhatsApp to Typebot chatbot
 */
exports.relayToTypebot = async (req, res) => {
  try {
    const { from, message, clientId } = req.body;
    
    // Input validation
    if (!from || !message || !clientId) {
      return res.status(400).json({ 
        success: false, 
        error: 'חסרים פרמטרים חובה: from, message, clientId' 
      });
    }
    
    // Find the connection and verify Typebot is configured
    const connection = await Connection.findById(clientId);
    
    if (!connection) {
      return res.status(404).json({ success: false, error: 'חיבור לא נמצא' });
    }
    
    if (!connection.typebotEnabled || !connection.typebotId) {
      return res.status(400).json({ 
        success: false, 
        error: 'צ\'אטבוט לא מופעל או לא מוגדר' 
      });
    }

    console.log(`Relaying message to Typebot - From: ${from}, Message: ${message}, TypebotID: ${connection.typebotId}`);
    
    // Send the message to the Typebot API
    try {
      const typebotResponse = await axios.post(`${TYPEBOT_API_URL}/sendMessage`, {
        sessionId: from, // Using the phone number as session ID for continuity
        message: message,
        typebot: connection.typebotId,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TYPEBOT_API_TOKEN}`
        }
      });
      
      // Check if we received a valid response
      if (typebotResponse.data && typebotResponse.data.messages && typebotResponse.data.messages.length > 0) {
        console.log(`Received ${typebotResponse.data.messages.length} messages from Typebot`);
        
        // Send each message back through WhatsApp
        for (const botMessage of typebotResponse.data.messages) {
          if (botMessage.type === 'text' && botMessage.content) {
            await WhatsAppService.sendMessage(clientId, from, botMessage.content);
            console.log(`Sent message to WhatsApp: ${botMessage.content.substring(0, 50)}...`);
          } else if (botMessage.type === 'image' && botMessage.content && botMessage.content.url) {
            // Handling image messages if your WhatsApp service supports it
            // This would need implementation in WhatsAppService if not already present
            console.log(`Image message received from Typebot but not implemented yet`);
          }
        }
        
        res.json({ 
          success: true, 
          messagesProcessed: typebotResponse.data.messages.length 
        });
      } else {
        console.log('No messages returned from Typebot or invalid response format');
        res.json({ 
          success: true, 
          messagesProcessed: 0,
          note: 'No response messages from chatbot' 
        });
      }
    } catch (typebotError) {
      console.error('Error communicating with Typebot API:', typebotError.message);
      
      // More detailed error logging
      if (typebotError.response) {
        console.error('Typebot API error response:', {
          status: typebotError.response.status,
          data: typebotError.response.data
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        error: 'שגיאה בתקשורת עם שרת הצ\'אטבוט',
        details: typebotError.message
      });
    }
  } catch (error) {
    console.error('Typebot relay error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'שגיאה פנימית בשרת',
      details: error.message 
    });
  }
};

/**
 * Get Typebot settings for a specific connection
 */
exports.getTypebotSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const clientId = req.params.clientId;
    
    console.log(`Getting typebot settings - ClientID: ${clientId}, UserID: ${userId}`);
    
    // אם clientId הוא "default", מצא את החיבור הראשון של המשתמש
    let connection;
    if (clientId === 'default') {
      connection = await Connection.findOne({ userId });
      console.log('Found connection by userId:', connection ? connection._id : 'None found');
    } else {
      // אחרת, נסה למצוא לפי המזהה שסופק
      try {
        connection = await Connection.findOne({ 
          $or: [
            { _id: clientId },
            { userId: userId }
          ]
        });
        console.log('Found connection by id:', connection ? connection._id : 'None found');
      } catch (idError) {
        console.error('Error finding connection by ID:', idError);
        // נסה למצוא חיבור כלשהו של המשתמש
        connection = await Connection.findOne({ userId });
        console.log('Fallback - Found connection by userId:', connection ? connection._id : 'None found');
      }
    }
    
    if (!connection) {
      return res.status(404).json({ success: false, error: 'לא נמצא חיבור למשתמש זה' });
    }
    
    res.json({
      success: true,
      typebotEnabled: connection.typebotEnabled || false,
      typebotId: connection.typebotId || ''
    });
  } catch (error) {
    console.error('Get typebot settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Save Typebot settings for a specific connection
 */
exports.saveTypebotSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const clientId = req.params.clientId;
    const { typebotEnabled, typebotId } = req.body;
    
    console.log(`Saving typebot settings - ClientID: ${clientId}, UserID: ${userId}, Enabled: ${typebotEnabled}, ID: ${typebotId}`);
    
    // מצא חיבור ע"פ אותו לוגיקה
    let connection;
    if (clientId === 'default') {
      connection = await Connection.findOne({ userId });
    } else {
      try {
        connection = await Connection.findOne({ 
          $or: [
            { _id: clientId },
            { userId: userId }
          ]
        });
      } catch (idError) {
        connection = await Connection.findOne({ userId });
      }
    }
    
    // אם אין חיבור קיים, צור חיבור חדש
    if (!connection) {
      connection = new Connection({
        userId,
        status: 'not_initialized'
      });
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
    console.error('Save typebot settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Test Typebot connection
 */
exports.testTypebotConnection = async (req, res) => {
  try {
    const { typebotId } = req.body;
    
    if (!typebotId) {
      return res.status(400).json({ success: false, error: 'נדרש מזהה צ\'אטבוט' });
    }
    
    try {
      // Simply attempt to fetch the typebot configuration or status
      const typebotResponse = await axios.get(`${TYPEBOT_API_URL}/typebot/${typebotId}/status`, {
        headers: {
          'Authorization': `Bearer ${TYPEBOT_API_TOKEN}`
        }
      });
      
      res.json({ 
        success: true, 
        message: 'התחברות לצ\'אטבוט הצליחה',
        status: typebotResponse.data
      });
    } catch (typebotError) {
      console.error('Error testing Typebot connection:', typebotError.message);
      
      if (typebotError.response && typebotError.response.status === 404) {
        return res.status(404).json({
          success: false,
          error: 'צ\'אטבוט לא נמצא - בדוק את מזהה הצ\'אטבוט'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'שגיאה בבדיקת חיבור לצ\'אטבוט',
        details: typebotError.message
      });
    }
  } catch (error) {
    console.error('Test typebot connection error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};