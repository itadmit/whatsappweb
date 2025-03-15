const axios = require('axios');
const Connection = require('../models/Connection');
const WhatsAppService = require('../services/whatsappService');

// הגדרות Typebot
const TYPEBOT_API_URL = 'http://localhost:8081/api/v1'; // שימוש בפורט 8081 במקום 3001

// העברת הודעות מ-WhatsApp לצ'אטבוט
exports.relayToTypebot = async (req, res) => {
  try {
    const { from, message, clientId } = req.body;
    
    // בדיקה אם יש חיבור
    const connection = await Connection.findById(clientId);
    if (!connection || !connection.typebotId) {
      return res.status(400).json({ 
        success: false, 
        error: 'חיבור לא נמצא או לא מוגדר Typebot ID'
      });
    }

    // שליחה לצ'אטבוט
    const typebotResponse = await axios.post(`${TYPEBOT_API_URL}/sendMessage`, {
      sessionId: from,
      message: message,
      typebot: connection.typebotId,
    });
    
    // בדיקה אם התקבלה תשובה מהצ'אטבוט
    if (typebotResponse.data && typebotResponse.data.messages && typebotResponse.data.messages.length > 0) {
      // שליחת התשובה בחזרה דרך WhatsApp
      for (const botMessage of typebotResponse.data.messages) {
        if (botMessage.type === 'text' && botMessage.content) {
          await WhatsAppService.sendMessage(clientId, from, botMessage.content);
        }
      }
      
      res.json({ success: true });
    } else {
      res.json({ success: false, error: 'No response from chatbot' });
    }
  } catch (error) {
    console.error('Typebot relay error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// קבלת הגדרות צ'אטבוט
exports.getTypebotSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const clientId = req.params.clientId;
    
    const connection = await Connection.findOne({ _id: clientId, userId });
    
    if (!connection) {
      return res.status(404).json({ success: false, error: 'לא נמצא חיבור' });
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

// שמירת הגדרות צ'אטבוט
exports.saveTypebotSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const clientId = req.params.clientId;
    const { typebotEnabled, typebotId } = req.body;
    
    const connection = await Connection.findOne({ _id: clientId, userId });
    
    if (!connection) {
      return res.status(404).json({ success: false, error: 'לא נמצא חיבור' });
    }
    
    // עדכון הגדרות
    connection.typebotEnabled = typebotEnabled;
    connection.typebotId = typebotId;
    await connection.save();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Save typebot settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};