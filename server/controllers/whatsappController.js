const WhatsAppService = require('../services/whatsappService');

exports.initializeClient = async (req, res) => {
  const { clientId } = req.params;
  
  try {
    const result = await WhatsAppService.createClient(clientId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getQR = async (req, res) => {
  const { clientId } = req.params;
  
  try {
    const result = await WhatsAppService.getQR(clientId);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  const { clientId } = req.params;
  const { phone, message } = req.body;
  
  if (!phone || !message) {
    return res.status(400).json({ error: 'Phone number and message are required' });
  }
  
  try {
    const result = await WhatsAppService.sendMessage(clientId, phone, message);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getStatus = (req, res) => {
  const { clientId } = req.params;
  const status = WhatsAppService.getStatus(clientId);
  res.json(status);
};

exports.disconnectClient = async (req, res) => {
  const { clientId } = req.params;
  
  try {
    const result = await WhatsAppService.disconnectClient(clientId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};