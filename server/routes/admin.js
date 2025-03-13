const express = require('express');
const router = express.Router();

// נתיב בסיסי - בשלב מאוחר יותר יתווספו כאן נתיבי API לאדמין
router.get('/users', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Admin route is working',
    users: [] 
  });
});

module.exports = router;