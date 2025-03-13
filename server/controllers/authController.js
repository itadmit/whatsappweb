const User = require('../models/User');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

// רישום משתמש חדש
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, plan, acceptedTerms } = req.body;
    
    // בדיקה שכל השדות החובה הוזנו
    if (!name || !email || !password || !phone || !plan) {
      return res.status(400).json({
        success: false,
        error: 'יש למלא את כל השדות החובה'
      });
    }
    
    // בדיקה שהתקנון אושר
    if (!acceptedTerms) {
      return res.status(400).json({
        success: false,
        error: 'יש לאשר את התקנון כדי להירשם'
      });
    }
    
    // בדיקה אם האימייל כבר קיים במערכת
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'כתובת האימייל כבר קיימת במערכת'
      });
    }
    
    // יצירת משתמש חדש
    const user = new User({
      name,
      email,
      password,
      phone,
      plan,
      acceptedTerms: true
    });
    
    // שמירת המשתמש במסד הנתונים
    await user.save();
    
    // החזרת תשובה חיובית
    res.status(201).json({
      success: true,
      message: 'המשתמש נרשם בהצלחה',
      userId: user._id
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'שגיאה ברישום המשתמש. נסה שוב מאוחר יותר.'
    });
  }
};

// התחברות
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // בדיקה שהוזנו אימייל וסיסמה
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'יש להזין אימייל וסיסמה'
      });
    }
    
    // חיפוש המשתמש לפי אימייל
    const user = await User.findOne({ email });
    
    // אם המשתמש לא נמצא או הסיסמה שגויה
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        error: 'אימייל או סיסמה שגויים'
      });
    }
    
    // בדיקה שהמשתמש פעיל
    if (!user.active) {
      return res.status(403).json({
        success: false,
        error: 'החשבון אינו פעיל. אנא פנה לתמיכה.'
      });
    }
    
    // יצירת טוקן JWT
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        role: user.role
      },
      config.jwtSecret,
      { expiresIn: '24h' }
    );
    
    // החזרת תשובה עם הטוקן
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        apiKey: user.apiKey
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'שגיאה בהתחברות. נסה שוב מאוחר יותר.'
    });
  }
};

// אימות טוקן
exports.verifyToken = (req, res) => {
  // בדיקת הטוקן מתבצעת במידלוור, אם הגענו לכאן הטוקן תקין
  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    }
  });
};

// איפוס סיסמה - שלב ראשון (שליחת מייל)
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'יש להזין כתובת אימייל'
      });
    }
    
    // בדיקה אם המשתמש קיים
    const user = await User.findOne({ email });
    if (!user) {
      // מסיבות אבטחה, נחזיר תשובה חיובית גם אם המשתמש לא קיים
      return res.json({
        success: true,
        message: 'אם האימייל קיים במערכת, נשלח אליו הוראות לאיפוס הסיסמה'
      });
    }
    
    // כאן יש להוסיף קוד לשליחת מייל עם קישור לאיפוס סיסמה
    // ...
    
    res.json({
      success: true,
      message: 'הוראות לאיפוס הסיסמה נשלחו לאימייל שהוזן'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      error: 'שגיאה בבקשה לאיפוס הסיסמה. נסה שוב מאוחר יותר.'
    });
  }
};