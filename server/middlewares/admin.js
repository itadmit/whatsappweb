// מידלוור לבדיקת הרשאות אדמין
exports.adminMiddleware = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
    next();
  } else {
    res.status(403).json({ success: false, error: 'אין לך הרשאות מתאימות' });
  }
};