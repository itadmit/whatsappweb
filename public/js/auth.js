document.addEventListener('DOMContentLoaded', function() {
    // בדיקה לאיזה דף אנחנו
    const isRegisterPage = document.getElementById('register-form');
    const isLoginPage = document.getElementById('login-form');
    
    if (isRegisterPage) {
        // טיפול בטופס הרשמה
        isRegisterPage.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formResult = document.getElementById('form-result');
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            
            // איסוף נתונים מהטופס
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
                phone: document.getElementById('phone').value,
                plan: document.querySelector('input[name="plan"]:checked').value,
                acceptedTerms: document.getElementById('terms').checked
            };
            
            if (!formData.acceptedTerms) {
                formResult.innerHTML = '<div class="alert alert-error">יש לאשר את התקנון כדי להירשם</div>';
                return;
            }
            
            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'שולח...';
                
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    formResult.innerHTML = '<div class="alert alert-success">ההרשמה בוצעה בהצלחה! מעביר אותך להתחברות...</div>';
                    
                    setTimeout(() => {
                        window.location.href = '/login.html?message=ההרשמה+הושלמה+בהצלחה&type=success';
                    }, 2000);
                } else {
                    formResult.innerHTML = `<div class="alert alert-error">שגיאה: ${data.error || 'אירעה שגיאה. נסה שוב.'}</div>`;
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
            } catch (error) {
                console.error('Registration error:', error);
                formResult.innerHTML = '<div class="alert alert-error">שגיאה בהרשמה, נסה שוב מאוחר יותר</div>';
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        });
    }
    
    if (isLoginPage) {
        // טיפול בטופס התחברות
        isLoginPage.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const loginAlert = document.getElementById('login-alert');
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            
            const formData = {
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
                remember: document.getElementById('remember')?.checked || false
            };
            
            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> מתחבר...';
                
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // שמירת טוקן וניתוב לדשבורד
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('userData', JSON.stringify(data.user));
                    
                    loginAlert.className = 'alert alert-success';
                    loginAlert.textContent = 'התחברות מוצלחת! מעביר אותך ללוח הבקרה...';
                    loginAlert.style.display = 'block';
                    
                    setTimeout(() => {
                        window.location.href = '/dashboard.html';
                    }, 1500);
                } else {
                    loginAlert.className = 'alert alert-error';
                    loginAlert.textContent = data.error || 'שגיאה בהתחברות. נסה שוב.';
                    loginAlert.style.display = 'block';
                    
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
            } catch (error) {
                console.error('Login error:', error);
                loginAlert.className = 'alert alert-error';
                loginAlert.textContent = 'שגיאה בהתחברות. נסה שוב מאוחר יותר.';
                loginAlert.style.display = 'block';
                
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        });
        
        // טיפול בשכחת סיסמה
        const forgotPassword = document.getElementById('forgot-password');
        if (forgotPassword) {
            forgotPassword.addEventListener('click', async function(e) {
                e.preventDefault();
                
                const email = document.getElementById('email').value;
                const loginAlert = document.getElementById('login-alert');
                
                if (!email) {
                    loginAlert.className = 'alert alert-error';
                    loginAlert.textContent = 'הזן כתובת אימייל כדי לאפס את הסיסמה';
                    loginAlert.style.display = 'block';
                    return;
                }
                
                try {
                    const response = await fetch('/api/auth/reset-password-request', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ email })
                    });
                    
                    loginAlert.className = 'alert alert-success';
                    loginAlert.textContent = 'נשלחו הנחיות לאיפוס הסיסמה לאימייל שהזנת';
                    loginAlert.style.display = 'block';
                } catch (error) {
                    console.error('Reset password error:', error);
                    loginAlert.className = 'alert alert-error';
                    loginAlert.textContent = 'שגיאה בשליחת הנחיות לאיפוס סיסמה';
                    loginAlert.style.display = 'block';
                }
            });
        }
    }
    
    // בדיקה אם יש הודעת URL
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    const type = urlParams.get('type') || 'success';
    const alertElement = document.getElementById('login-alert') || document.getElementById('form-result');
    
    if (message && alertElement) {
        alertElement.className = `alert alert-${type}`;
        alertElement.textContent = message;
        alertElement.style.display = 'block';
    }
});