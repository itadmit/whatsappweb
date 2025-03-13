// מידלוור לאימות משתמשים
exports.authMiddleware = (req, res, next) => {
    // בשלב זה, נאפשר גישה ללא אימות אמיתי לצורך פיתוח
    req.user = { id: '1', email: 'demo@example.com', role: 'user' };
    next();
  };