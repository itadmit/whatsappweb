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
  
  // במקום לטעון תמונה מ-via.placeholder.com
  if (qrCodeImg) {
    qrCodeImg.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23f5f5f5"/%3E%3Ctext x="100" y="100" font-family="Arial" font-size="14" text-anchor="middle"%3EQR Code%3C/text%3E%3C/svg%3E';
  }

  // בדיקת טוקן האימות
  checkToken();
  
  // יצירת/וידוא חיבור למשתמש
  initConnection();
  
  // טעינת נתוני משתמש
  loadUserData();
  
  // טעינת נתוני סטטיסטיקה
  loadStatistics();
  
  // טעינת סטטוס חיבור
  loadConnectionStatus();
  
  // טעינת הגדרות וובהוק
  loadWebhookSettings();
  
  // טעינת הגדרות צ'אטבוט
  loadTypebotSettings();
  
  // אירועי לחיצה
  if (showKeyBtn) showKeyBtn.addEventListener('click', toggleApiKey);
  if (copyKeyBtn) copyKeyBtn.addEventListener('click', copyApiKey);
  if (connectBtn) connectBtn.addEventListener('click', initiateConnection);
  if (saveWebhookBtn) saveWebhookBtn.addEventListener('click', saveWebhook);
  if (sendTestBtn) sendTestBtn.addEventListener('click', sendTestMessage);
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
  
  // הוספת מאזיני אירועים לצ'אטבוט
  if (typebotToggle) {
    typebotToggle.addEventListener('change', updateTypebotStatus);
  }
  
  if (saveTypebotBtn) {
    saveTypebotBtn.addEventListener('click', saveTypebotSettings);
  }
  
  // הוספת כפתור בדיקת חיבור לצ'אטבוט
  if (typebotId) {
    const testBtn = document.createElement('button');
    testBtn.type = 'button';
    testBtn.className = 'btn btn-small typebot-test-btn';
    testBtn.innerHTML = '<i class="fas fa-vial"></i> בדוק חיבור';
    testBtn.addEventListener('click', testTypebotConnection);
    
    // הוספת הכפתור אחרי שדה מזהה הצ'אטבוט
    typebotId.parentNode.appendChild(testBtn);
  }
  
  // --- פונקציות ---
  
  // בדיקת תוקף הטוקן של המשתמש
  function checkToken() {
    const token = localStorage.getItem('token');
    console.log('Token exists:', !!token);
    
    if (!token) {
      window.location.href = '/login.html';
      return;
    }
    
    fetch('/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => response.json())
    .then(data => {
      console.log('Token verification result:', data);
      if (!data.success) {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
      }
    })
    .catch(error => {
      console.error('Token verification error:', error);
      localStorage.removeItem('token');
      window.location.href = '/login.html';
    });
  }
  
  // בדיקת חיבור משתמש
  function checkAuthentication() {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '/login.html';
      return;
    }
    
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
  
  // אתחול חיבור המשתמש
  function initConnection() {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '/login.html';
      return;
    }
    
    fetch('/api/clients/init-connection', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
        return null;
      }
      return response.json();
    })
    .then(data => {
      if (data && data.success) {
        console.log('Connection initialized:', data.connectionId);
        
        // שמור את מזהה החיבור
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        userData.connectionId = data.connectionId;
        localStorage.setItem('userData', JSON.stringify(userData));
        
        // עדכן את המזהה הגלובלי
        if (data.connectionId) {
          clientId = data.connectionId;
        }
        
        // עדכן את הממשק עם נתוני הצ'אטבוט
        if (typebotToggle && typebotId) {
          typebotToggle.checked = data.typebotEnabled || false;
          typebotId.value = data.typebotId || '';
          // עדכון הסטטוס הויזואלי
          updateTypebotStatus();
        }
      }
    })
    .catch(error => {
      console.error('Error initializing connection:', error);
    });
  }
  
  // טעינת נתוני משתמש
  function loadUserData() {
    const token = localStorage.getItem('token');
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    // הצגת נתוני המשתמש בדף
    if (userName) {
      userName.textContent = userData.name || 'משתמש';
    }
    
    // הצגת סוג החבילה
    if (userPlanEl) {
      const planDisplay = {
        'basic': 'בסיס',
        'pro': 'פרו',
        'platinum': 'פלטיניום'
      };
      userPlanEl.textContent = planDisplay[userData.plan] || userData.plan || 'בסיס';
    }
    
    // טיפול במפתח API
    if (apiKeyValue) {
      apiKeyValue.textContent = '••••••••••••••••••••••';
      if (userData.apiKey) {
        localStorage.setItem('apiKey', userData.apiKey);
      }
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
        if (statsConnections) statsConnections.textContent = data.stats.activeConnections || 0;
        if (statsSent) statsSent.textContent = data.stats.messagesSent || 0;
        if (statsReceived) statsReceived.textContent = data.stats.messagesReceived || 0;
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
        if (data.clientId) {
          clientId = data.clientId;
        }
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
      if (data.success && data.webhook && webhookUrlInput) {
        webhookUrlInput.value = data.webhook.url || '';
      }
    })
    .catch(error => {
      console.error('Error loading webhook settings:', error);
    });
  }
  
  // טעינת הגדרות צ'אטבוט
  function loadTypebotSettings() {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No authentication token found');
      return;
    }
    
    console.log('Using token:', token.substring(0, 10) + '...');
    
    fetch('/api/clients/default/typebot', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (response.status === 401) {
        console.error('Authentication failed - redirecting to login');
        localStorage.removeItem('token');
        window.location.href = '/login.html';
        return null;
      }
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data && data.success) {
        // עדכון הממשק
        if (typebotToggle && typebotId) {
          typebotToggle.checked = data.typebotEnabled || false;
          typebotId.value = data.typebotId || '';
          updateTypebotStatus();
        }
      }
    })
    .catch(error => {
      console.error('Error loading typebot settings:', error);
    });
  }
  
  // עדכון סטטוס חיבור בממשק
  function updateConnectionStatus(status) {
    const statusIndicator = document.querySelector('.status-indicator');
    
    if (!statusIndicator || !connectionStatus || !connectBtn) {
      return; // תוודא שהאלמנטים קיימים
    }
    
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
        if (qrContainer) qrContainer.style.display = 'none';
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
        if (qrContainer) qrContainer.style.display = 'none';
        break;
      case 'initializing':
        connectionStatus.textContent = 'מאתחל...';
        connectBtn.disabled = true;
        if (qrContainer) qrContainer.style.display = 'none';
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
  
  // עדכון סטטוס צ'אטבוט בממשק
  function updateTypebotStatus() {
    if (!typebotToggle) return;
    
    // עדכון הסטטוס הויזואלי
    const statusIndicator = document.getElementById('typebot-status-indicator');
    const statusText = document.getElementById('typebot-status-text');
    
    if (statusIndicator && statusText) {
      if (typebotToggle.checked) {
        statusIndicator.classList.remove('disabled');
        statusIndicator.classList.add('enabled');
        statusText.textContent = 'צ\'אטבוט פעיל';
      } else {
        statusIndicator.classList.remove('enabled');
        statusIndicator.classList.add('disabled');
        statusText.textContent = 'צ\'אטבוט לא פעיל';
      }
    }
    
    // עדכון מצב שדה מזהה הצ'אטבוט
    if (typebotId) {
      typebotId.disabled = !typebotToggle.checked;
      
      if (!typebotToggle.checked) {
        typebotId.classList.add('disabled-field');
      } else {
        typebotId.classList.remove('disabled-field');
      }
    }
  }
  
  // טעינת קוד QR
  function loadQRCode() {
    const token = localStorage.getItem('token');
    
    if (!qrContainer || !qrCodeImg) return;
    
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
                if (connectBtn) connectBtn.disabled = false;
              }
            })
            .catch(error => {
              console.error('Error checking status:', error);
              clearInterval(qrCheckInterval);
              qrCheckInterval = null;
              if (connectBtn) connectBtn.disabled = false;
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
  
  // שמירת הגדרות צ'אטבוט
  function saveTypebotSettings() {
    const token = localStorage.getItem('token');
    
    if (!typebotToggle || !typebotId || !saveTypebotBtn) {
      console.error('Typebot form elements not found');
      return;
    }
    
    // בדיקת תקינות
    if (typebotToggle.checked && (!typebotId.value || typebotId.value.trim() === '')) {
      alert('יש להזין מזהה צ\'אטבוט כאשר הצ\'אטבוט מופעל');
      return;
    }
    
    saveTypebotBtn.disabled = true;
    saveTypebotBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> שומר...';
    
    fetch(`/api/clients/${clientId}/typebot`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        typebotEnabled: typebotToggle.checked,
        typebotId: typebotId.value.trim()
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        alert('הגדרות הצ\'אטבוט נשמרו בהצלחה!');
        updateTypebotStatus();
      } else {
        alert(`שגיאה: ${data.error || 'לא ניתן לשמור את ההגדרות'}`);
      }
    })
    .catch(error => {
      console.error('Error saving Typebot settings:', error);
      alert('שגיאה בשמירת הגדרות. נסה שוב מאוחר יותר.');
    })
    .finally(() => {
      saveTypebotBtn.disabled = false;
      saveTypebotBtn.textContent = 'שמור הגדרות';
    });
  }
  
  // בדיקת חיבור לצ'אטבוט
  function testTypebotConnection() {
    const token = localStorage.getItem('token');
    const typebotIdValue = typebotId.value.trim();
    
    if (!typebotIdValue) {
      alert('יש להזין מזהה צ\'אטבוט');
      return;
    }
    
    // הצגת אנימציית טעינה
    const testBtn = document.createElement('button');
    testBtn.id = 'test-typebot-btn';
    testBtn.className = 'btn btn-outline';
    testBtn.innerHTML = '<i class="fas fa-sync fa-spin"></i> בודק...';
    
    const saveBtn = document.getElementById('save-typebot-btn');
    if (saveBtn) {
      saveBtn.parentNode.insertBefore(testBtn, saveBtn);
    }
    
    fetch('/api/typebot/test-connection', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ typebotId: typebotIdValue })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert('החיבור לצ\'אטבוט נבדק בהצלחה!');
      } else {
        alert(`שגיאה בבדיקת החיבור: ${data.error}`);
      }
    })
    .catch(error => {
      console.error('Error testing Typebot connection:', error);
      alert('שגיאה בבדיקת החיבור. נסה שוב מאוחר יותר.');
    })
    .finally(() => {
      // הסרת כפתור הבדיקה
      const testBtn = document.getElementById('test-typebot-btn');
      if (testBtn) {
        testBtn.parentNode.removeChild(testBtn);
      }
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