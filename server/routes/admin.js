const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// נתיבי ניהול משתמשים
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// נתיבי סטטיסטיקות
router.get('/statistics', adminController.getStatistics);

// נתיבי הגדרות מערכת
router.get('/settings/general', adminController.getGeneralSettings);
router.post('/settings/general', (req, res) => {
  // בפרויקט אמיתי היינו שומרים את ההגדרות במסד נתונים
  res.json({ success: true, message: 'הגדרות כלליות נשמרו בהצלחה' });
});

router.get('/settings/api', adminController.getApiSettings);
router.post('/settings/api', (req, res) => {
  // בפרויקט אמיתי היינו שומרים את ההגדרות במסד נתונים
  res.json({ success: true, message: 'הגדרות API נשמרו בהצלחה' });
});

// נתיבי חבילות
router.get('/plans/:id', (req, res) => {
  const planId = req.params.id;
  let plan = {};
  
  // בפרויקט אמיתי היינו מושכים את הנתונים ממסד הנתונים
  switch (planId) {
    case 'basic':
      plan = {
        name: 'חבילת בסיס',
        price: 99,
        maxMessages: 1000,
        maxConnections: 1,
        features: {
          media: false,
          webhooks: false,
          advancedApi: false,
          statistics: false
        }
      };
      break;
    case 'pro':
      plan = {
        name: 'חבילת פרו',
        price: 199,
        maxMessages: 5000,
        maxConnections: 3,
        features: {
          media: true,
          webhooks: true,
          advancedApi: false,
          statistics: false
        }
      };
      break;
    case 'platinum':
      plan = {
        name: 'חבילת פלטיניום',
        price: 399,
        maxMessages: 0, // ללא הגבלה
        maxConnections: 0, // ללא הגבלה
        features: {
          media: true,
          webhooks: true,
          advancedApi: true,
          statistics: true
        }
      };
      break;
    default:
      return res.status(404).json({ success: false, error: 'חבילה לא נמצאה' });
  }
  
  res.json({ success: true, plan });
});

router.put('/plans/:id', (req, res) => {
  // בפרויקט אמיתי היינו שומרים את השינויים במסד נתונים
  res.json({ success: true, message: 'החבילה עודכנה בהצלחה' });
});

// נתיבי תבניות אימייל
router.get('/email-templates/:id', (req, res) => {
  const templateId = req.params.id;
  let template = {};
  
  // בפרויקט אמיתי היינו מושכים את הנתונים ממסד הנתונים
  switch (templateId) {
    case 'welcome':
      template = {
        subject: 'ברוכים הבאים ל-WhatsConnect',
        content: 'שלום {שם},\n\nתודה שהצטרפת ל-WhatsConnect! אנו שמחים לברך אותך בברכת הצטרפות למשפחה שלנו.\n\nכדי להתחיל, היכנס לחשבון שלך באמצעות הקישור הבא: {קישור}\n\nבברכה,\nצוות WhatsConnect'
      };
      break;
    case 'reset-password':
      template = {
        subject: 'איפוס סיסמה ל-WhatsConnect',
        content: 'שלום {שם},\n\nקיבלנו בקשה לאיפוס הסיסמה שלך.\n\nלחץ על הקישור הבא כדי לאפס את הסיסמה: {קישור}\n\nאם לא ביקשת לאפס את הסיסמה, אנא התעלם מהודעה זו.\n\nבברכה,\nצוות WhatsConnect'
      };
      break;
    case 'invoice':
      template = {
        subject: 'חשבונית חודשית WhatsConnect',
        content: 'שלום {שם},\n\nמצורפת חשבונית עבור שירותי WhatsConnect לחודש {תאריך}.\n\nחבילה: {חבילה}\nסכום: {סכום}\n\nתודה שבחרת בנו,\nצוות WhatsConnect'
      };
      break;
    default:
      return res.status(404).json({ success: false, error: 'תבנית לא נמצאה' });
  }
  
  res.json({ success: true, template });
});

router.put('/email-templates/:id', (req, res) => {
  // בפרויקט אמיתי היינו שומרים את השינויים במסד נתונים
  res.json({ success: true, message: 'תבנית האימייל עודכנה בהצלחה' });
});

// נתיבי תחזוקה
router.post('/maintenance/clear-cache', (req, res) => {
  // בפרויקט אמיתי היינו מבצעים פעולת ניקוי מטמון
  res.json({ success: true, message: 'המטמון נוקה בהצלחה' });
});

router.post('/maintenance/backup', (req, res) => {
  // בפרויקט אמיתי היינו מבצעים פעולת גיבוי
  res.json({ success: true, message: 'גיבוי נוצר בהצלחה' });
});

router.post('/maintenance/sync-connections', (req, res) => {
  // בפרויקט אמיתי היינו מבצעים סנכרון חיבורים
  res.json({ success: true, message: 'חיבורים סונכרנו בהצלחה' });
});

router.post('/maintenance/toggle-mode', (req, res) => {
  // בפרויקט אמיתי היינו מחליפים מצב תחזוקה
  const maintenanceMode = true; // דוגמה - המצב לאחר החלפה
  res.json({ success: true, message: 'מצב תחזוקה הוחלף בהצלחה', maintenanceMode });
});

// נתיב לקבלת לוגים
router.get('/logs', (req, res) => {
  const level = req.query.level || 'all';
  
  // בפרויקט אמיתי היינו מושכים לוגים ממסד נתונים או מקובץ
  // כאן נחזיר נתוני דוגמה
  const logs = [
    {
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      level: 'error',
      message: 'נכשל חיבור לשרת WhatsApp - Client ID: 603f12a1b456789'
    },
    {
      timestamp: new Date(Date.now() - 1000 * 60 * 8),
      level: 'warning',
      message: 'חריגה מהגבלת קצב בקשות - User ID: 5ff1a2b3c789'
    },
    {
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      level: 'info',
      message: 'משתמש חדש נרשם - User ID: 603f1c456d78'
    },
    {
      timestamp: new Date(Date.now() - 1000 * 60 * 20),
      level: 'info',
      message: 'גיבוי מסד נתונים הושלם בהצלחה'
    },
    {
      timestamp: new Date(Date.now() - 1000 * 60 * 25),
      level: 'warning',
      message: 'שגיאת וובהוק - URL: https://example.com/webhook, Status: 404'
    },
    {
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      level: 'error',
      message: 'שגיאת חיבור למסד נתונים - נסיון חוזר מספר 3'
    }
  ];
  
  // סינון לפי רמת לוג אם נדרש
  const filteredLogs = level === 'all' ? logs : logs.filter(log => log.level === level);
  
  res.json({ success: true, logs: filteredLogs });
});

module.exports = router;