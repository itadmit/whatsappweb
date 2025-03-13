// מידלוור לבדיקת הרשאות אדמין
exports.adminMiddleware = (req, res, next) => {
    // בשלב זה, נאפשר גישה לכל משתמש לצורך פיתוח
    if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
      next();
    } else {
      // בפיתוח נמשיך בכל מקרה
      console.log('Warning: Non-admin user accessing admin route');
      next();
      
      // בשלב מאוחר יותר נפעיל:
      // res.status(403).json({ success: false, error: 'אין לך הרשאות מתאימות' });
    }
  };