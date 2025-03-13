const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');
const { authMiddleware } = require('./middlewares/auth');
const { adminMiddleware } = require('./middlewares/admin');
const adminController = require('./controllers/adminController');

// ייבוא נתיבים
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const indexRoutes = require('./routes/index');

// יצירת אפליקציית Express
const app = express();

// חיבור למסד נתונים
mongoose.connect(config.databaseUri)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // יצירת משתמש מנהל ראשי (רק בפעם הראשונה)
    adminController.createSuperAdmin();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/admin', authMiddleware, adminMiddleware, adminRoutes);
app.use('/', indexRoutes);

// טיפול בשגיאות
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'שגיאת שרת פנימית'
  });
});

// הפעלת השרת
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${config.environment}`);
});