const express = require('express');
const router = express.Router();
const path = require('path');

// נתיב ראשי - מציג את דף הנחיתה
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// נתיב לדשבורד - לעתיד
router.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/dashboard.html'));
});

module.exports = router;