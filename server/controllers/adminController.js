const User = require('../models/User');
const Connection = require('../models/Connection');
const MessageStats = require('../models/MessageStats');
const config = require('../config/config');
const mongoose = require('mongoose');

// קבלת משתמשים עם פרמטרי חיפוש וסינון
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const planFilter = req.query.plan || '';
    const statusFilter = req.query.status || '';
    
    // יצירת אובייקט פילטרים
    const filter = {};
    
    // הוספת חיפוש אם יש
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // הוספת פילטר חבילה
    if (planFilter) {
      filter.plan = planFilter;
    }
    
    // הוספת פילטר סטטוס
    if (statusFilter) {
      filter.active = statusFilter === 'active';
    }
    
    // חישוב סך הכל משתמשים וספירת עמודים
    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / limit);
    
    // קבלת רשימת משתמשים
    const users = await User.find(filter)
      .select('-password') // לא להחזיר סיסמאות
      .sort({ createdAt: -1 }) // מיון לפי תאריך יצירה (חדש לישן)
      .skip(skip)
      .limit(limit);
    
    res.json({
      success: true,
      users,
      pagination: {
        totalUsers,
        totalPages,
        currentPage: page,
        hasMore: page < totalPages
      }
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      error: 'שגיאה בקבלת רשימת משתמשים'
    });
  }
};

// קבלת משתמש לפי מזהה
exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'משתמש לא נמצא'
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({
      success: false,
      error: 'שגיאה בקבלת נתוני משתמש'
    });
  }
};

// יצירת משתמש חדש
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, phone, plan, role, active, acceptedTerms = true } = req.body;
    
    // בדיקה שכל השדות החובה הוזנו
    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        error: 'נא למלא את כל שדות החובה'
      });
    }
    
    // בדיקה אם אימייל כבר קיים
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'אימייל זה כבר רשום במערכת'
      });
    }
    
    // יצירת משתמש חדש
    const newUser = new User({
      name,
      email,
      password,
      phone,
      plan: plan || 'basic',
      role: role || 'user',
      active: active !== undefined ? active : true,
      acceptedTerms
    });
    
    await newUser.save();
    
    res.status(201).json({
      success: true,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        plan: newUser.plan,
        role: newUser.role,
        active: newUser.active,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'שגיאה ביצירת משתמש חדש'
    });
  }
};

// עדכון משתמש קיים
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, password, phone, plan, role, active } = req.body;
    
    // מציאת המשתמש
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'משתמש לא נמצא'
      });
    }
    
    // עדכון נתונים
    if (name) user.name = name;
    if (email && email !== user.email) {
      // בדיקה אם האימייל החדש כבר קיים
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'אימייל זה כבר רשום במערכת'
        });
      }
      user.email = email;
    }
    if (password) user.password = password; // הסיסמה תוצפן אוטומטית בזכות middleware
    if (phone) user.phone = phone;
    if (plan) user.plan = plan;
    if (role) user.role = role;
    if (active !== undefined) user.active = active;
    
    await user.save();
    
    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        plan: user.plan,
        role: user.role,
        active: user.active,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'שגיאה בעדכון המשתמש'
    });
  }
};

// מחיקת משתמש
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // בדיקה אם המשתמש קיים
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'משתמש לא נמצא'
      });
    }
    
    // מוודא שמשתמש סופר-אדמין לא ימחק
    if (user.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'לא ניתן למחוק משתמש סופר-אדמין'
      });
    }
    
    // מחיקת החיבורים והסטטיסטיקות של המשתמש
    await Connection.deleteMany({ userId });
    await MessageStats.deleteMany({ userId });
    
    // מחיקת המשתמש עצמו
    await User.findByIdAndDelete(userId);
    
    res.json({
      success: true,
      message: 'המשתמש נמחק בהצלחה'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'שגיאה במחיקת המשתמש'
    });
  }
};

// קבלת סטטיסטיקות מערכת
exports.getStatistics = async (req, res) => {
  try {
    const dateRange = req.query.range || 'week';
    let startDate = new Date();
    
    // הגדרת טווח תאריכים לפי בחירת המשתמש
    switch (dateRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }
    
    // סטטיסטיקות כוללות
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments({ createdAt: { $gte: startDate } });
    const activeConnections = await Connection.countDocuments({ status: 'connected' });
    
    // סיכום סטטיסטיקות הודעות
    const messageStats = await MessageStats.aggregate([
      {
        $match: { date: { $gte: startDate } }
      },
      {
        $group: {
          _id: null,
          messagesSent: { $sum: '$messagesSent' },
          messagesReceived: { $sum: '$messagesReceived' }
        }
      }
    ]);
    
    const totalMessages = messageStats.length > 0 ? 
      messageStats[0].messagesSent + messageStats[0].messagesReceived : 0;
    
    // התפלגות חבילות
    const planStats = await User.aggregate([
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const plansData = {};
    planStats.forEach(stat => {
      plansData[stat._id] = stat.count;
    });
    
    // נתוני גרף משתמשים
    const usersChartData = await generateUsersChartData(startDate);
    
    // נתוני גרף הודעות
    const messagesChartData = await generateMessagesChartData(startDate);
    
    // משתמשים פעילים לאחרונה
    const activeUsers = await getActiveUsers(10);
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        newUsers,
        activeConnections,
        totalMessages
      },
      charts: {
        users: usersChartData,
        messages: messagesChartData,
        plans: plansData
      },
      activeUsers
    });
  } catch (error) {
    console.error('Error generating statistics:', error);
    res.status(500).json({
      success: false,
      error: 'שגיאה בהפקת סטטיסטיקות'
    });
  }
};

// נתונים לגרף משתמשים
async function generateUsersChartData(startDate) {
  const endDate = new Date();
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  
  // יצירת מערך תאריכים
  const dates = [];
  const newUsersData = [];
  const totalUsersData = [];
  const labels = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(new Date(date));
    
    // פורמט התאריך לתצוגה
    const formattedDate = date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
    labels.push(formattedDate);
  }
  
  // ספירת משתמשים חדשים לכל יום
  for (const date of dates) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const newUsersCount = await User.countDocuments({
      createdAt: {
        $gte: date,
        $lt: nextDate
      }
    });
    
    newUsersData.push(newUsersCount);
    
    // חישוב סה"כ משתמשים עד לאותו יום
    const totalUsers = await User.countDocuments({
      createdAt: { $lt: nextDate }
    });
    
    totalUsersData.push(totalUsers);
  }
  
  return {
    labels,
    newUsers: newUsersData,
    totalUsers: totalUsersData
  };
}

// נתונים לגרף הודעות
async function generateMessagesChartData(startDate) {
  const endDate = new Date();
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  
  // יצירת מערך תאריכים
  const dates = [];
  const sentData = [];
  const receivedData = [];
  const labels = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(new Date(date));
    
    // פורמט התאריך לתצוגה
    const formattedDate = date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
    labels.push(formattedDate);
  }
  
  // איסוף נתוני הודעות לכל יום
  for (const date of dates) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const dailyStats = await MessageStats.aggregate([
      {
        $match: {
          date: {
            $gte: date,
            $lt: nextDate
          }
        }
      },
      {
        $group: {
          _id: null,
          sent: { $sum: '$messagesSent' },
          received: { $sum: '$messagesReceived' }
        }
      }
    ]);
    
    const sent = dailyStats.length > 0 ? dailyStats[0].sent : 0;
    const received = dailyStats.length > 0 ? dailyStats[0].received : 0;
    
    sentData.push(sent);
    receivedData.push(received);
  }
  
  return {
    labels,
    sent: sentData,
    received: receivedData
  };
}

// קבלת משתמשים פעילים
async function getActiveUsers(limit) {
  // אנו מחשיבים משתמש פעיל כמי ששלח או קיבל הודעות לאחרונה
  const stats = await MessageStats.aggregate([
    {
      $group: {
        _id: '$userId',
        messageCount: { $sum: { $add: ['$messagesSent', '$messagesReceived'] } },
        lastActive: { $max: '$date' }
      }
    },
    {
      $sort: { lastActive: -1 }
    },
    {
      $limit: limit
    }
  ]);
  
  // שליפת פרטי המשתמשים
  const activeUsers = [];
  
  for (const stat of stats) {
    const user = await User.findById(stat._id).select('name email plan');
    
    if (user) {
      activeUsers.push({
        _id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        messageCount: stat.messageCount,
        lastActive: stat.lastActive
      });
    }
  }
  
  return activeUsers;
}

// קבלת הגדרות כלליות של המערכת
exports.getGeneralSettings = async (req, res) => {
  try {
    // בפרויקט אמיתי היינו שומרים את ההגדרות במסד הנתונים
    // כאן נחזיר ערכי ברירת מחדל מקובץ הקונפיגורציה
    res.json({
      success: true,
      settings: {
        siteName: 'WhatsConnect',
        siteDescription: 'API מקצועי לוואטסאפ',
        contactEmail: 'support@whatsconnect.com',
        supportPhone: '050-1234567',
        maxClients: config.maxClientsPerServer || 10,
        openRegistration: true
      }
    });
  } catch (error) {
    console.error('Error getting general settings:', error);
    res.status(500).json({
      success: false,
      error: 'שגיאה בטעינת הגדרות כלליות'
    });
  }
};

// קבלת הגדרות API
exports.getApiSettings = async (req, res) => {
  try {
    // בפרויקט אמיתי היינו שומרים את ההגדרות במסד הנתונים
    res.json({
      success: true,
      settings: {
        rateLimit: 60,
        timeout: 30,
        webhookRetry: 3,
        corsEnabled: true,
        corsDomains: '*'
      }
    });
  } catch (error) {
    console.error('Error getting API settings:', error);
    res.status(500).json({
      success: false,
      error: 'שגיאה בטעינת הגדרות API'
    });
  }
};

// יצירת משתמש ראשי (מנהל מערכת)
exports.createSuperAdmin = async () => {
  try {
    // בדיקה אם כבר קיים משתמש מנהל ראשי
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    
    if (existingSuperAdmin) {
      console.log('Super admin already exists');
      return;
    }
    
    // יצירת משתמש מנהל ראשי חדש
    const superAdmin = new User({
      name: 'מנהל מערכת',
      email: 'admin@whatsconnect.com',
      password: 'admin1234',
      phone: '050-1234567',
      role: 'super_admin',
      plan: 'platinum',
      active: true,
      acceptedTerms: true
    });
    
    await superAdmin.save();
    console.log('Super admin created successfully');
  } catch (error) {
    console.error('Error creating super admin:', error);
  }
};