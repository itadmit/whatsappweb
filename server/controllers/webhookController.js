const WhatsAppService = require('../services/whatsappService');

exports.setWebhook = (req, res) => {
  const { clientId } = req.params;
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'Webhook URL is required' });
  }
  
  try {
    const result = WhatsAppService.setWebhook(clientId, url);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};