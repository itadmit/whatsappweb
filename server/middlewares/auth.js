const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');

// מידלוור לאימות משתמשים
exports.authMiddleware = async (req, res, next) => {
  try {
    // בדיקה אם קיים טוקן בכותרת
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key']; // אימות באמצעות API key
    
    // אם יש API key
    if (apiKey) {
      const user = await User.findOne({ apiKey });
      if (user) {
        req.user = user;
        return next();
      }
    }
    
    // אם יש טוקן JWT
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      try {
        // אימות הטוקן
        const decoded = jwt.verify(token, config.jwtSecret);
        
        // מציאת המשתמש במסד הנתונים
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
          return res.status(401).json({ success: false, error: 'משתמש לא נמצא' });
        }
        
        // הוספת המשתמש לאובייקט הבקשה
        req.user = user;
        return next();
      } catch (error) {
        return res.status(401).json({ success: false, error: 'טוקן לא תקף' });
      }
    }
    
    return res.status(401).json({ success: false, error: 'אימות נדרש' });
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ success: false, error: 'שגיאת שרת באימות' });
  }
};