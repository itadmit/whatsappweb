const Connection = require('../models/Connection');

// הגדרת webhook
exports.setWebhook = async (req, res) => {
  try {
    const userId = req.user._id;
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ success: false, error: 'כתובת Webhook היא שדה חובה' });
    }
    
    // בדיקה אם קיים חיבור
    const connection = await Connection.findOne({ userId });
    
    if (!connection) {
      return res.status(404).json({ success: false, error: 'לא נמצא חיבור' });
    }
    
    // עדכון כתובת ה-webhook
    connection.webhookUrl = url;
    await connection.save();
    
    // עדכון השירות של WhatsApp
    const clientId = connection._id.toString();
    const result = await WhatsAppService.setWebhook(clientId, url);
    
    res.json({ success: true, webhook: { url } });
  } catch (error) {
    console.error('Set webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// קבלת הגדרות webhook
exports.getWebhook = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // בדיקה אם קיים חיבור
    const connection = await Connection.findOne({ userId });
    
    if (!connection) {
      return res.status(404).json({ success: false, error: 'לא נמצא חיבור' });
    }
    
    res.json({ 
      success: true, 
      webhook: { 
        url: connection.webhookUrl 
      } 
    });
  } catch (error) {
    console.error('Get webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};