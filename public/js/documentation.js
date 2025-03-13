document.addEventListener('DOMContentLoaded', function() {
    // בדיקה אם המשתמש מחובר
    checkAuthentication();
    
    // אלמנטים בדף
    const apiKeyElement = document.getElementById('api-key');
    const showKeyBtn = document.getElementById('show-key-btn');
    const copyKeyBtn = document.getElementById('copy-key-btn');
    const logoutBtn = document.getElementById('logout-btn');
    
    // אירועי לחיצה
    if (showKeyBtn) showKeyBtn.addEventListener('click', toggleApiKey);
    if (copyKeyBtn) copyKeyBtn.addEventListener('click', copyApiKey);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    
    // טעינת מפתח ה-API
    loadApiKey();
    
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
    
    // טעינת מפתח ה-API
    function loadApiKey() {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        
        if (userData.apiKey) {
            localStorage.setItem('apiKey', userData.apiKey);
            // מפתח מוסתר כברירת מחדל
            apiKeyElement.textContent = '••••••••••••••••••••••';
        } else {
            // אם אין מפתח API, נטען אותו מהפרופיל
            const token = localStorage.getItem('token');
            
            fetch('/api/auth/profile', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success && data.user) {
                    localStorage.setItem('apiKey', data.user.apiKey);
                    apiKeyElement.textContent = '••••••••••••••••••••••';
                }
            })
            .catch(error => {
                console.error('Error loading API key:', error);
            });
        }
    }
    
    // הצגה/הסתרה של מפתח API
    function toggleApiKey() {
        const currentKey = apiKeyElement.textContent;
        const storedKey = localStorage.getItem('apiKey');
        
        if (currentKey === '••••••••••••••••••••••') {
            apiKeyElement.textContent = storedKey;
            showKeyBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            apiKeyElement.textContent = '••••••••••••••••••••••';
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
    
    // הוספת סגנון CSS להערות
    const style = document.createElement('style');
    style.textContent = `
        .note {
            background-color: rgba(52, 183, 241, 0.1);
            border-left: 4px solid var(--secondary-color);
            padding: 15px;
            margin: 15px 0;
            border-radius: 3px;
        }
    `;
    document.head.appendChild(style);
});