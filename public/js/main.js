document.addEventListener('DOMContentLoaded', function() {

      // בדוק אם האלמנטים הנדרשים קיימים בדף
      const clientIdElement = document.getElementById('client-id');
    
      // אם האלמנטים לא קיימים, פשוט צא מהפונקציה
      if (!clientIdElement) {
          console.log('WhatsApp client elements not found on this page');
          return; // צא מהפונקציה
      }
      
      // המשך הקוד רק אם האלמנטים קיימים



    // אלמנטים בדף
    const clientId = document.getElementById('client-id').value;
    const initBtn = document.getElementById('init-btn');
    const statusValue = document.getElementById('status-value');
    const qrContainer = document.getElementById('qr-container');
    const qrCodeImg = document.getElementById('qr-code');
    const messageForm = document.getElementById('message-form');
    const phoneInput = document.getElementById('phone');
    const messageInput = document.getElementById('message');
    const sendBtn = document.getElementById('send-btn');
    const resultDiv = document.getElementById('result');
    const webhookUrlInput = document.getElementById('webhook-url');
    const setWebhookBtn = document.getElementById('set-webhook-btn');
    const webhookResult = document.getElementById('webhook-result');
    
    // משתנים גלובליים
    let qrCheckInterval;
    
    // בדיקת סטטוס התחברות בטעינת הדף
    checkInitialStatus();
    
    // אירוע לחיצה על כפתור התחברות
    initBtn.addEventListener('click', async () => {
      try {
        initBtn.disabled = true;
        initBtn.textContent = 'מתחבר...';
        
        const response = await fetch(`/api/clients/${clientId}/init`);
        const data = await response.json();
        
        updateStatus(data.status);
        
        // התחלת בדיקה לקוד QR
        if (!qrCheckInterval) {
          qrCheckInterval = setInterval(checkQrCode, 2000);
        }
        
        initBtn.disabled = false;
        initBtn.textContent = 'התחל חיבור';
      } catch (error) {
        console.error('Error initializing WhatsApp', error);
        initBtn.disabled = false;
        initBtn.textContent = 'התחל חיבור';
      }
    });
    
    // אירוע לחיצה על כפתור שליחת הודעה
    sendBtn.addEventListener('click', async () => {
      const phone = phoneInput.value.trim();
      const message = messageInput.value.trim();
      
      if (!phone || !message) {
        resultDiv.innerHTML = `<div class="alert alert-error">יש למלא את כל השדות</div>`;
        return;
      }
      
      try {
        sendBtn.disabled = true;
        sendBtn.textContent = 'שולח...';
        
        const response = await fetch(`/api/clients/${clientId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ phone, message })
        });
        
        const data = await response.json();
        
        if (data.success) {
          resultDiv.innerHTML = `<div class="alert alert-success">ההודעה נשלחה בהצלחה! (ID: ${data.messageId})</div>`;
          messageInput.value = '';
        } else {
          resultDiv.innerHTML = `<div class="alert alert-error">שגיאה: ${data.error}</div>`;
        }
        
        sendBtn.disabled = false;
        sendBtn.textContent = 'שלח הודעה';
      } catch (error) {
        resultDiv.innerHTML = `<div class="alert alert-error">שגיאה בשליחת ההודעה</div>`;
        console.error('Error sending message', error);
        
        sendBtn.disabled = false;
        sendBtn.textContent = 'שלח הודעה';
      }
    });
    
    // אירוע לחיצה על כפתור הגדרת וובהוק
    setWebhookBtn.addEventListener('click', async () => {
      const url = webhookUrlInput.value.trim();
      
      if (!url) {
        webhookResult.innerHTML = `<div class="alert alert-error">יש להזין כתובת Webhook</div>`;
        return;
      }
      
      try {
        setWebhookBtn.disabled = true;
        setWebhookBtn.textContent = 'שומר...';
        
        const response = await fetch(`/api/clients/${clientId}/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        
        if (data.success) {
          webhookResult.innerHTML = `<div class="alert alert-success">כתובת Webhook נשמרה בהצלחה</div>`;
        } else {
          webhookResult.innerHTML = `<div class="alert alert-error">שגיאה: ${data.error}</div>`;
        }
        
        setWebhookBtn.disabled = false;
        setWebhookBtn.textContent = 'שמור הגדרות';
      } catch (error) {
        webhookResult.innerHTML = `<div class="alert alert-error">שגיאה בשמירת כתובת Webhook</div>`;
        console.error('Error setting webhook', error);
        
        setWebhookBtn.disabled = false;
        setWebhookBtn.textContent = 'שמור הגדרות';
      }
    });
    
    // פונקציה לבדיקת קוד QR
    async function checkQrCode() {
      try {
        const response = await fetch(`/api/clients/${clientId}/qr`);
        
        if (!response.ok) {
          // אם הקוד עדיין לא נוצר, המשך לנסות
          return;
        }
        
        const data = await response.json();
        
        updateStatus(data.status);
        
        if (data.qrCode) {
          qrCodeImg.src = data.qrCode;
          qrContainer.style.display = 'block';
        }
        
        // אם מחובר, הפסק לבדוק QR
        if (data.status === 'connected') {
          clearInterval(qrCheckInterval);
          qrCheckInterval = null;
          qrContainer.style.display = 'none';
          messageForm.style.display = 'block';
        }
      } catch (error) {
        // ייתכן ש-QR עדיין לא נוצר, המשך לנסות
      }
    }
    
    // פונקציה לבדיקת סטטוס התחברות
    async function checkInitialStatus() {
      try {
        const response = await fetch(`/api/clients/${clientId}/status`);
        const data = await response.json();
        
        updateStatus(data.status);
        
        if (data.status === 'connected') {
          messageForm.style.display = 'block';
        }
      } catch (error) {
        console.error('Error checking status', error);
      }
    }
    
    // פונקציה לעדכון סטטוס
    function updateStatus(status) {
      statusValue.className = '';
      statusValue.classList.add(`status-${status}`);
      
      switch (status) {
        case 'connected':
          statusValue.textContent = 'מחובר';
          break;
        case 'disconnected':
          statusValue.textContent = 'מנותק';
          break;
        case 'initializing':
          statusValue.textContent = 'מאתחל...';
          break;
        case 'qr_ready':
          statusValue.textContent = 'ממתין לסריקת QR';
          break;
        case 'not_initialized':
          statusValue.textContent = 'לא מאותחל';
          break;
        default:
          statusValue.textContent = status;
      }
    }
    
    // הוספת CSS עבור התראות
    const style = document.createElement('style');
    style.textContent = `
      .alert {
        padding: 12px;
        border-radius: 5px;
        margin: 10px 0;
      }
      .alert-success {
        background-color: rgba(76, 175, 80, 0.1);
        color: #4CAF50;
        border: 1px solid #4CAF50;
      }
      .alert-error {
        background-color: rgba(244, 67, 54, 0.1);
        color: #F44336;
        border: 1px solid #F44336;
      }
    `;
    document.head.appendChild(style);
  });