document.addEventListener('DOMContentLoaded', function() {
    // בדיקה אם המשתמש מחובר
    checkAuthentication();
    
    // אלמנטים בדף
    const userName = document.getElementById('user-name');
    const apiKey = document.getElementById('api-key');
    const showKeyBtn = document.getElementById('show-key-btn');
    const copyKeyBtn = document.getElementById('copy-key-btn');
    const activeConnectionsEl = document.getElementById('active-connections');
    const messagesSentEl = document.getElementById('messages-sent');
    const messagesReceivedEl = document.getElementById('messages-received');
    const userPlanEl = document.getElementById('user-plan');
    const connectionStatus = document.getElementById('connection-status');
    const connectBtn = document.getElementById('connect-btn');
    const qrContainer = document.getElementById('qr-container');
    const qrCodeImg = document.getElementById('qr-code');
    const webhookUrlInput = document.getElementById('webhook-url');
    const saveWebhookBtn = document.getElementById('save-webhook-btn');
    const webhookResult = document.getElementById('webhook-result');
    const testPhoneInput = document.getElementById('test-phone');
    const testMessageInput = document.getElementById('test-message');
    const sendTestBtn = document.getElementById('send-test-btn');
    const sendResult = document.getElementById('send-result');
    const logoutBtn = document.getElementById('logout-btn');
    
    // טעינת נתוני משתמש
    loadUserData();
    
    // טעינ
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
      window.location.href = '/login.html';
    });
  }
  
  // טעינת נתוני משתמש
  function loadUserData() {
    const token = localStorage.getItem('token');
    
    fetch('/api/user/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // הצגת נתוני המשתמש בדף
        userName.textContent = data.user.name;
        apiKey.textContent = '********';
        localStorage.setItem('apiKey', data.user.apiKey); // שמירה בסטורג' מקומי
        
        // הצגת סוג החבילה
        const planDisplay = {
          'basic': 'בסיס',
          'pro': 'פרו',
          'platinum': 'פלטיניום'
        };
        userPlanEl.textContent = planDisplay[data.user.plan] || data.user.plan;
      }
    })
    .catch(error => {
      console.error('Error loading user data:', error);
    });
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
        activeConnectionsEl.textContent = data.stats.activeConnections || 0;
        messagesSentEl.textContent = data.stats.messagesSent || 0;
        messagesReceivedEl.textContent = data.stats.messagesReceived || 0;
      }
    })
    .catch(error => {
      console.error('Error loading statistics:', error);
    });
  }
  
  // טעינת סטטוס חיבור
  function loadConnectionStatus() {
    const token = localStorage.getItem('token');
    
    fetch('/api/whatsapp/status', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        updateConnectionStatus(data.status);
      }
    })
    .catch(error => {
      console.error('Error loading connection status:', error);
      updateConnectionStatus('disconnected');
    });
  }
  
  // טעינת הגדרות וובהוק
  function loadWebhookSettings() {
    const token = localStorage.getItem('token');
    
    fetch('/api/webhook/settings', {
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
    const statusIndicator = connectionStatus.querySelector('.status-indicator');
    const statusText = connectionStatus.querySelector('.status-text');
    
    // הסרת כל הקלאסים הקודמים
    statusIndicator.className = 'status-indicator';
    
    // הוספת קלאס לפי הסטטוס
    statusIndicator.classList.add(status);
    
    // עדכון טקסט הסטטוס
    switch (status) {
      case 'connected':
        statusText.textContent = 'מחובר';
        connectBtn.textContent = 'התנתק';
        connectBtn.dataset.action = 'disconnect';
        qrContainer.style.display = 'none';
        break;
      case 'disconnected':
        statusText.textContent = 'מנותק';
        connectBtn.textContent = 'התחבר לוואטסאפ';
        connectBtn.dataset.action = 'connect';
        qrContainer.style.display = 'none';
        break;
      case 'initializing':
        statusText.textContent = 'מאתחל...';
        connectBtn.disabled = true;
        qrContainer.style.display = 'none';
        break;
      case 'qr_ready':
        statusText.textContent = 'ממתין לסריקת QR';
        connectBtn.disabled = true;
        loadQRCode();
        break;
      default:
        statusText.textContent = status;
    }
  }
  
  // טעינת קוד QR
  function loadQRCode() {
    const token = localStorage.getItem('token');
    
    fetch('/api/whatsapp/qr', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.success && data.qrCode) {
        qrCodeImg.src = data.qrCode;
        qrContainer.style.display = 'block';
        
        // בדיקה מחזורית של סטטוס החיבור
        const statusCheckInterval = setInterval(() => {
          fetch('/api/whatsapp/status', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          .then(response => response.json())
          .then(statusData => {
            if (statusData.success) {
              updateConnectionStatus(statusData.status);
              
              // אם מחובר או בכל מצב שאינו "ממתין לקוד QR", הפסק את הבדיקה
              if (statusData.status !== 'qr_ready') {
                clearInterval(statusCheckInterval);
                connectBtn.disabled = false;
              }
            }
          })
          .catch(error => {
            console.error('Error checking status:', error);
            clearInterval(statusCheckInterval);
            connectBtn.disabled = false;
          });
        }, 3000); // בדיקה כל 3 שניות
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
    
    const endpoint = action === 'connect' ? '/api/whatsapp/connect' : '/api/whatsapp/disconnect';
    
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // אם זה חיבור, עדכן סטטוס והתחל לבדוק QR
        if (action === 'connect') {
          updateConnectionStatus(data.status || 'initializing');
          if (data.status === 'qr_ready') {
            loadQRCode();
          }
        } else {
          // אם זה ניתוק, עדכן סטטוס למנותק
          updateConnectionStatus('disconnected');
        }
      } else {
        // שגיאה - אפשר לחיצה שוב
        connectBtn.disabled = false;
        connectBtn.textContent = action === 'connect' ? 'התחבר לוואטסאפ' : 'התנתק';
        alert('שגיאה: ' + (data.error || 'לא ניתן לבצע את הפעולה'));
      }
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
      webhookResult.innerHTML = '<div class="alert alert-error">יש להזין כתובת Webhook</div>';
      return;
    }
    
    saveWebhookBtn.disabled = true;
    saveWebhookBtn.textContent = 'שומר...';
    
    fetch('/api/webhook/settings', {
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
        webhookResult.innerHTML = '<div class="alert alert-success">הגדרות נשמרו בהצלחה</div>';
      } else {
        webhookResult.innerHTML = `<div class="alert alert-error">שגיאה: ${data.error || 'לא ניתן לשמור את ההגדרות'}</div>`;
      }
      
      saveWebhookBtn.disabled = false;
      saveWebhookBtn.textContent = 'שמור הגדרות';
    })
    .catch(error => {
      console.error('Save webhook error:', error);
      webhookResult.innerHTML = '<div class="alert alert-error">שגיאה בשמירת ההגדרות. נסה שוב מאוחר יותר.</div>';
      
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
      sendResult.innerHTML = '<div class="alert alert-error">יש למלא את כל השדות</div>';
      return;
    }
    
    sendTestBtn.disabled = true;
    sendTestBtn.textContent = 'שולח...';
    
    fetch('/api/whatsapp/send', {
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
        sendResult.innerHTML = `<div class="alert alert-success">ההודעה נשלחה בהצלחה! (ID: ${data.messageId || 'N/A'})</div>`;
        testMessageInput.value = '';
        
        // עדכון סטטיסטיקה
        const currentCount = parseInt(messagesSentEl.textContent) || 0;
        messagesSentEl.textContent = currentCount + 1;
      } else {
        sendResult.innerHTML = `<div class="alert alert-error">שגיאה: ${data.error || 'לא ניתן לשלוח את ההודעה'}</div>`;
      }
      
      sendTestBtn.disabled = false;
      sendTestBtn.textContent = 'שלח הודעת בדיקה';
    })
    .catch(error => {
      console.error('Send message error:', error);
      sendResult.innerHTML = '<div class="alert alert-error">שגיאה בשליחת ההודעה. נסה שוב מאוחר יותר.</div>';
      
      sendTestBtn.disabled = false;
      sendTestBtn.textContent = 'שלח הודעת בדיקה';
    });
  }
  
  // הצגה/הסתרה של מפתח API
  function toggleApiKey() {
    const currentKey = apiKey.textContent;
    const storedKey = localStorage.getItem('apiKey');
    
    if (currentKey === '********') {
      apiKey.textContent = storedKey;
      showKeyBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
      apiKey.textContent = '********';
      showKeyBtn.innerHTML = '<i class="fas fa-eye"></i>';
    }
  }
  
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
    localStorage.removeItem('apiKey');
    window.location.href = '/login.html';
  }
});