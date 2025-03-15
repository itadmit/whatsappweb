document.addEventListener('DOMContentLoaded', function() {
  // בדיקה אם המשתמש מחובר
  checkAuthentication();
  
  // אלמנטים בדף
  const userName = document.getElementById('user-name');
  const apiKeyValue = document.getElementById('api-key-value');
  const showKeyBtn = document.getElementById('show-key-btn');
  const copyKeyBtn = document.getElementById('copy-key-btn');
  const statsConnections = document.getElementById('stats-connections');
  const statsSent = document.getElementById('stats-sent');
  const statsReceived = document.getElementById('stats-received');
  const userPlanEl = document.getElementById('user-plan');
  const connectionStatus = document.getElementById('connection-status');
  const connectBtn = document.getElementById('connect-btn');
  const qrContainer = document.getElementById('qr-container');
  const qrCodeImg = document.getElementById('qr-code');
  const webhookUrlInput = document.getElementById('webhook-url');
  const saveWebhookBtn = document.getElementById('save-webhook-btn');
  const testPhoneInput = document.getElementById('test-phone');
  const testMessageInput = document.getElementById('test-message');
  const sendTestBtn = document.getElementById('send-test-btn');
  const logoutBtn = document.getElementById('logout-btn');
  
  const typebotToggle = document.getElementById('typebot-toggle');
  const typebotId = document.getElementById('typebot-id');
  const saveTypebotBtn = document.getElementById('save-typebot-btn');

  // החיבור לקוח - המזהה יהיה מזהה החיבור הקיים במסד הנתונים
  let clientId = 'default';
  let qrCheckInterval;
  
  // טעינת נתוני משתמש
  loadUserData();
  
  // טעינת נתוני סטטיסטיקה
  loadStatistics();
  
  // טעינת סטטוס חיבור
  loadConnectionStatus();
  
  // טעינת הגדרות וובהוק
  loadWebhookSettings();
  
  // אירועי לחיצה
  showKeyBtn.addEventListener('click', toggleApiKey);
  copyKeyBtn.addEventListener('click', copyApiKey);
  connectBtn.addEventListener('click', initiateConnection);
  saveWebhookBtn.addEventListener('click', saveWebhook);
  sendTestBtn.addEventListener('click', sendTestMessage);
  logoutBtn.addEventListener('click', logout);
  
  // פונקציות
  
  // בדיקת חיבור משתמש
  function checkAuthentication() {
      const token = localStorage.getItem('token');
      
      if (!token) {
          // אם אין טוקן, העבר לדף התחברות
          window.location.href = '/login.html';
          return;
      }
      
      // בדיקת תוקף הטוקן מול השרת
      fetch('/api/auth/verify', {
          headers: {
              'Authorization': `Bearer ${token}`
          }
      })
      .then(response => {
          if (!response.ok) {
              throw new Error('Token invalid');
          }
          return response.json();
      })
      .catch(error => {
          console.error('Authentication error:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('userData');
          window.location.href = '/login.html';
      });
  }
  
  // טעינת נתוני משתמש
  function loadUserData() {
      const token = localStorage.getItem('token');
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      
      // הצגת נתוני המשתמש בדף
      userName.textContent = userData.name || 'משתמש';
      
      // הצגת סוג החבילה
      const planDisplay = {
          'basic': 'בסיס',
          'pro': 'פרו',
          'platinum': 'פלטיניום'
      };
      userPlanEl.textContent = planDisplay[userData.plan] || userData.plan || 'בסיס';
      
      // טיפול במפתח API
      apiKeyValue.textContent = '••••••••••••••••••••••';
      if (userData.apiKey) {
          localStorage.setItem('apiKey', userData.apiKey);
      }
  }
  
  // טעינת נתוני סטטיסטיקה
  function loadStatistics() {
      const token = localStorage.getItem('token');
      
      fetch('/api/user/statistics', {
          headers: {
              'Authorization': `Bearer ${token}`
          }
      })
      .then(response => response.json())
      .then(data => {
          if (data.success) {
              // הצגת הסטטיסטיקה
              statsConnections.textContent = data.stats.activeConnections || 0;
              statsSent.textContent = data.stats.messagesSent || 0;
              statsReceived.textContent = data.stats.messagesReceived || 0;
          }
      })
      .catch(error => {
          console.error('Error loading statistics:', error);
      });
  }
  
  // טעינת סטטוס חיבור
  function loadConnectionStatus() {
      const token = localStorage.getItem('token');
      
      fetch('/api/clients/default/status', {
          headers: {
              'Authorization': `Bearer ${token}`
          }
      })
      .then(response => response.json())
      .then(data => {
          if (data.status) {
              updateConnectionStatus(data.status);
              clientId = data.clientId || 'default';
          }
      })
      .catch(error => {
          console.error('Error loading connection status:', error);
          updateConnectionStatus('not_initialized');
      });
  }
  
  // טעינת הגדרות וובהוק
  function loadWebhookSettings() {
      const token = localStorage.getItem('token');
      
      fetch(`/api/clients/${clientId}/webhook`, {
          headers: {
              'Authorization': `Bearer ${token}`
          }
      })
      .then(response => response.json())
      .then(data => {
          if (data.success && data.webhook) {
              webhookUrlInput.value = data.webhook.url || '';
          }
      })
      .catch(error => {
          console.error('Error loading webhook settings:', error);
      });
  }
  
  // עדכון סטטוס חיבור בממשק
  function updateConnectionStatus(status) {
      const statusIndicator = document.querySelector('.status-indicator');
      
      // הסרת כל הקלאסים הקודמים
      statusIndicator.className = 'status-indicator';
      
      // הוספת קלאס לפי הסטטוס
      statusIndicator.classList.add(status === 'connected' ? 'connected' : 'disconnected');
      
      // עדכון טקסט הסטטוס
      switch (status) {
          case 'connected':
              connectionStatus.textContent = 'מחובר';
              connectBtn.textContent = 'התנתק';
              connectBtn.dataset.action = 'disconnect';
              qrContainer.style.display = 'none';
              if (qrCheckInterval) {
                  clearInterval(qrCheckInterval);
                  qrCheckInterval = null;
              }
              break;
          case 'disconnected':
          case 'not_initialized':
              connectionStatus.textContent = 'מנותק';
              connectBtn.textContent = 'התחבר לוואטסאפ';
              connectBtn.dataset.action = 'connect';
              qrContainer.style.display = 'none';
              break;
          case 'initializing':
              connectionStatus.textContent = 'מאתחל...';
              connectBtn.disabled = true;
              qrContainer.style.display = 'none';
              break;
          case 'qr_ready':
              connectionStatus.textContent = 'ממתין לסריקת QR';
              connectBtn.disabled = true;
              loadQRCode();
              break;
          default:
              connectionStatus.textContent = status;
      }
  }
  
  // טעינת קוד QR
  function loadQRCode() {
      const token = localStorage.getItem('token');
      
      fetch(`/api/clients/${clientId}/qr`, {
          headers: {
              'Authorization': `Bearer ${token}`
          }
      })
      .then(response => response.json())
      .then(data => {
          if (data.qrCode) {
              qrCodeImg.src = data.qrCode;
              qrContainer.style.display = 'block';
              
              // בדיקה מחזורית של סטטוס החיבור
              if (!qrCheckInterval) {
                  qrCheckInterval = setInterval(() => {
                      fetch(`/api/clients/${clientId}/status`, {
                          headers: {
                              'Authorization': `Bearer ${token}`
                          }
                      })
                      .then(response => response.json())
                      .then(statusData => {
                          updateConnectionStatus(statusData.status);
                          
                          // אם מחובר או בכל מצב שאינו "ממתין לקוד QR", הפסק את הבדיקה
                          if (statusData.status !== 'qr_ready') {
                              clearInterval(qrCheckInterval);
                              qrCheckInterval = null;
                              connectBtn.disabled = false;
                          }
                      })
                      .catch(error => {
                          console.error('Error checking status:', error);
                          clearInterval(qrCheckInterval);
                          qrCheckInterval = null;
                          connectBtn.disabled = false;
                      });
                  }, 3000); // בדיקה כל 3 שניות
              }
          }
      })
      .catch(error => {
          console.error('Error loading QR code:', error);
      });
  }
  
  // התחלת/ניתוק חיבור
  function initiateConnection() {
      const token = localStorage.getItem('token');
      const action = connectBtn.dataset.action || 'connect';
      
      connectBtn.disabled = true;
      connectBtn.textContent = action === 'connect' ? 'מתחבר...' : 'מתנתק...';
      
      const endpoint = action === 'connect' ? `/api/clients/${clientId}/init` : `/api/clients/${clientId}`;
      const method = action === 'connect' ? 'GET' : 'DELETE';
      
      fetch(endpoint, {
          method: method,
          headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
          }
      })
      .then(response => response.json())
      .then(data => {
          if (action === 'connect') {
              updateConnectionStatus(data.status || 'initializing');
              if (data.status === 'qr_ready') {
                  loadQRCode();
              }
          } else {
              // אם זה ניתוק, עדכן סטטוס למנותק
              updateConnectionStatus('disconnected');
          }
          
          // רענן סטטיסטיקות
          loadStatistics();
      })
      .catch(error => {
          console.error('Connection error:', error);
          connectBtn.disabled = false;
          connectBtn.textContent = action === 'connect' ? 'התחבר לוואטסאפ' : 'התנתק';
          alert('שגיאה בהתחברות. נסה שוב מאוחר יותר.');
      });
  }
  
  // שמירת הגדרות וובהוק
  function saveWebhook() {
      const token = localStorage.getItem('token');
      const url = webhookUrlInput.value.trim();
      
      if (!url) {
          alert('יש להזין כתובת Webhook');
          return;
      }
      
      saveWebhookBtn.disabled = true;
      saveWebhookBtn.textContent = 'שומר...';
      
      fetch(`/api/clients/${clientId}/webhook`, {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url })
      })
      .then(response => response.json())
      .then(data => {
          if (data.success) {
              alert('הגדרות ה-webhook נשמרו בהצלחה!');
          } else {
              alert(`שגיאה: ${data.error || 'לא ניתן לשמור את ההגדרות'}`);
          }
          
          saveWebhookBtn.disabled = false;
          saveWebhookBtn.textContent = 'שמור הגדרות';
      })
      .catch(error => {
          console.error('Save webhook error:', error);
          alert('שגיאה בשמירת ההגדרות. נסה שוב מאוחר יותר.');
          
          saveWebhookBtn.disabled = false;
          saveWebhookBtn.textContent = 'שמור הגדרות';
      });
  }
  
  // שליחת הודעת בדיקה
  function sendTestMessage() {
      const token = localStorage.getItem('token');
      const phone = testPhoneInput.value.trim();
      const message = testMessageInput.value.trim();
      
      if (!phone || !message) {
          alert('יש למלא את כל השדות');
          return;
      }
      
      sendTestBtn.disabled = true;
      sendTestBtn.textContent = 'שולח...';
      
      fetch(`/api/clients/${clientId}/messages`, {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ phone, message })
      })
      .then(response => response.json())
      .then(data => {
          if (data.success) {
              alert(`ההודעה נשלחה בהצלחה! (ID: ${data.messageId || 'N/A'})`);
              testMessageInput.value = '';
              
              // רענון סטטיסטיקות
              loadStatistics();
          } else {
              alert(`שגיאה: ${data.error || 'לא ניתן לשלוח את ההודעה'}`);
          }
          
          sendTestBtn.disabled = false;
          sendTestBtn.textContent = 'שלח הודעת בדיקה';
      })
      .catch(error => {
          console.error('Send message error:', error);
          alert('שגיאה בשליחת ההודעה. נסה שוב מאוחר יותר.');
          
          sendTestBtn.disabled = false;
          sendTestBtn.textContent = 'שלח הודעת בדיקה';
      });
  }
  
  // הצגה/הסתרה של מפתח API
  function toggleApiKey() {
      const currentKey = apiKeyValue.textContent;
      const storedKey = localStorage.getItem('apiKey');
      
      if (currentKey === '••••••••••••••••••••••') {
          apiKeyValue.textContent = storedKey;
          showKeyBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
      } else {
          apiKeyValue.textContent = '••••••••••••••••••••••';
          showKeyBtn.innerHTML = '<i class="fas fa-eye"></i>';
      }
  }

  function loadTypebotSettings() {
    const token = localStorage.getItem('token');
    
    fetch(`/api/clients/${clientId}/typebot`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        typebotToggle.checked = data.typebotEnabled || false;
        typebotId.value = data.typebotId || '';
      }
    })
    .catch(error => {
      console.error('Error loading typebot settings:', error);
    });
  }
  
  // אתר את המקום שבו מוגדרים מאזיני האירועים והוסף:
  // שמירת הגדרות צ'אטבוט
  if (saveTypebotBtn) {
    saveTypebotBtn.addEventListener('click', function() {
      const token = localStorage.getItem('token');
      
      saveTypebotBtn.disabled = true;
      saveTypebotBtn.textContent = 'שומר...';
      
      fetch(`/api/clients/${clientId}/typebot`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          typebotEnabled: typebotToggle.checked,
          typebotId: typebotId.value
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert('הגדרות הצ\'אטבוט נשמרו בהצלחה!');
        } else {
          alert(`שגיאה: ${data.error || 'לא ניתן לשמור את ההגדרות'}`);
        }
        
        saveTypebotBtn.disabled = false;
        saveTypebotBtn.textContent = 'שמור הגדרות';
      })
      .catch(error => {
        console.error('Save typebot settings error:', error);
        alert('שגיאה בשמירת ההגדרות. נסה שוב מאוחר יותר.');
        
        saveTypebotBtn.disabled = false;
        saveTypebotBtn.textContent = 'שמור הגדרות';
      });
    });
  }
  
  // אתר את הפונקציה שמאתחלת את הדף והוסף בסופה:
  loadTypebotSettings();
  
  
  // העתקת מפתח API ללוח
  function copyApiKey() {
      const storedKey = localStorage.getItem('apiKey');
      
      if (storedKey) {
          navigator.clipboard.writeText(storedKey)
              .then(() => {
                  // שינוי כפתור להצגת אישור
                  copyKeyBtn.innerHTML = '<i class="fas fa-check"></i>';
                  setTimeout(() => {
                      copyKeyBtn.innerHTML = '<i class="fas fa-copy"></i>';
                  }, 2000);
              })
              .catch(error => {
                  console.error('Copy failed:', error);
                  alert('לא ניתן להעתיק את המפתח. נסה שוב.');
              });
      }
  }
  
  // התנתקות
  function logout() {
      localStorage.removeItem('token');
      localStorage.removeItem('userData');
      localStorage.removeItem('apiKey');
      window.location.href = '/login.html';
  }
});