const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/auth');

// נתיבי אימות
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify', authMiddleware, authController.verifyToken);
router.post('/reset-password-request', authController.requestPasswordReset);
router.post('/profile', authMiddleware, authController.getUserProfile);

module.exports = router;