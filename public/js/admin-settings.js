document.addEventListener('DOMContentLoaded', function() {
    // בדיקה אם המשתמש מחובר ובעל הרשאות מנהל
    checkAdminAuthentication();
    
    // אלמנטים בדף
    const settingsNav = document.querySelectorAll('.settings-nav a');
    const settingsTabs = document.querySelectorAll('.settings-tab');
    const generalForm = document.getElementById('general-form');
    const apiForm = document.getElementById('api-form');
    const editPlanButtons = document.querySelectorAll('.edit-plan');
    const editTemplateButtons = document.querySelectorAll('.edit-template');
    const planModal = document.getElementById('plan-modal');
    const templateModal = document.getElementById('template-modal');
    const planForm = document.getElementById('plan-form');
    const templateForm = document.getElementById('template-form');
    const closeButtons = document.querySelectorAll('.close-btn');
    const planCancelBtn = document.getElementById('plan-cancel-btn');
    const templateCancelBtn = document.getElementById('template-cancel-btn');
    const planSaveBtn = document.getElementById('plan-save-btn');
    const templateSaveBtn = document.getElementById('template-save-btn');
    const clearCacheBtn = document.getElementById('clear-cache-btn');
    const backupBtn = document.getElementById('backup-btn');
    const syncConnectionsBtn = document.getElementById('sync-connections-btn');
    const maintenanceModeBtn = document.getElementById('maintenance-mode-btn');
    const refreshLogBtn = document.getElementById('refresh-log-btn');
    const logLevel = document.getElementById('log-level');
    const logoutBtn = document.getElementById('logout-btn');
    
    // טעינת נתונים ראשונית
    loadGeneralSettings();
    loadApiSettings();
    
    // אירועי לחיצה לניווט בין לשוניות
    settingsNav.forEach(navItem => {
        navItem.addEventListener('click', function(e) {
            e.preventDefault();
            
            // הסרת קלאס 'active' מכל הלשוניות
            settingsNav.forEach(item => item.classList.remove('active'));
            settingsTabs.forEach(tab => tab.classList.remove('active'));
            
            // הוספת קלאס 'active' ללשונית שנבחרה
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // טיפול בטפסים
    if (generalForm) generalForm.addEventListener('submit', saveGeneralSettings);
    if (apiForm) apiForm.addEventListener('submit', saveApiSettings);
    
    // אירועי לחיצה לעריכת חבילות
    editPlanButtons.forEach(button => {
        button.addEventListener('click', function() {
            const planId = this.getAttribute('data-plan');
            openPlanModal(planId);
        });
    });
    
    // אירועי לחיצה לעריכת תבניות אימייל
    editTemplateButtons.forEach(button => {
        button.addEventListener('click', function() {
            const templateId = this.getAttribute('data-template');
            openTemplateModal(templateId);
        });
    });
    
    // כפתורי תחזוקה
    if (clearCacheBtn) clearCacheBtn.addEventListener('click', clearCache);
    if (backupBtn) backupBtn.addEventListener('click', createBackup);
    if (syncConnectionsBtn) syncConnectionsBtn.addEventListener('click', syncConnections);
    if (maintenanceModeBtn) maintenanceModeBtn.addEventListener('click', toggleMaintenanceMode);
    if (refreshLogBtn) refreshLogBtn.addEventListener('click', refreshLogs);
    if (logLevel) logLevel.addEventListener('change', filterLogs);
    
    // אירועי מודאל
    if (planSaveBtn) planSaveBtn.addEventListener('click', savePlan);
    if (templateSaveBtn) templateSaveBtn.addEventListener('click', saveTemplate);
    if (planCancelBtn) planCancelBtn.addEventListener('click', closePlanModal);
    if (templateCancelBtn) templateCancelBtn.addEventListener('click', closeTemplateModal);
    
    // סגירת מודאלים בלחיצה על X
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal.id === 'plan-modal') {
                closePlanModal();
            } else if (modal.id === 'template-modal') {
                closeTemplateModal();
            }
        });
    });
    
    // סגירת מודאלים בלחיצה מחוץ למודאל
    window.addEventListener('click', function(event) {
        if (event.target === planModal) {
            closePlanModal();
        } else if (event.target === templateModal) {
            closeTemplateModal();
        }
    });
    
    // התנתקות
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    
    // פונקציות
    
    // בדיקת הרשאות מנהל
    function checkAdminAuthentication() {
        const token = localStorage.getItem('token');
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        
        if (!token) {
            // אם אין טוקן, העבר לדף התחברות
            window.location.href = '/login.html';
            return;
        }
        
        // בדיקה אם המשתמש הוא מנהל
        if (userData.role !== 'admin' && userData.role !== 'super_admin') {
            // אם המשתמש אינו מנהל, העבר לדשבורד רגיל
            window.location.href = '/dashboard.html';
            return;
        }
        
        // בדיקת תוקף הטוקן
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
    
    // טעינת הגדרות כלליות
    function loadGeneralSettings() {
        const token = localStorage.getItem('token');
        
        fetch('/api/admin/settings/general', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // מילוי הטופס בנתונים שנטענו
                document.getElementById('site-name').value = data.settings.siteName || '';
                document.getElementById('site-description').value = data.settings.siteDescription || '';
                document.getElementById('contact-email').value = data.settings.contactEmail || '';
                document.getElementById('support-phone').value = data.settings.supportPhone || '';
                document.getElementById('max-clients').value = data.settings.maxClients || '';
                document.getElementById('open-registration').checked = data.settings.openRegistration || false;
            } else {
                console.error('Error loading general settings:', data.error);
            }
        })
        .catch(error => {
            console.error('Error loading general settings:', error);
        });
    }
    
    // טעינת הגדרות API
    function loadApiSettings() {
        const token = localStorage.getItem('token');
        
        fetch('/api/admin/settings/api', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // מילוי הטופס בנתונים שנטענו
                document.getElementById('api-rate-limit').value = data.settings.rateLimit || '';
                document.getElementById('api-timeout').value = data.settings.timeout || '';
                document.getElementById('webhook-retry').value = data.settings.webhookRetry || '';
                document.getElementById('cors-enabled').checked = data.settings.corsEnabled || false;
                document.getElementById('cors-domains').value = data.settings.corsDomains || '';
            } else {
                console.error('Error loading API settings:', data.error);
            }
        })
        .catch(error => {
            console.error('Error loading API settings:', error);
        });
    }
    
    // שמירת הגדרות כלליות
    function saveGeneralSettings(e) {
        e.preventDefault();
        
        const token = localStorage.getItem('token');
        const formData = {
            siteName: document.getElementById('site-name').value,
            siteDescription: document.getElementById('site-description').value,
            contactEmail: document.getElementById('contact-email').value,
            supportPhone: document.getElementById('support-phone').value,
            maxClients: document.getElementById('max-clients').value,
            openRegistration: document.getElementById('open-registration').checked
        };
        
        fetch('/api/admin/settings/general', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('ההגדרות הכלליות נשמרו בהצלחה');
            } else {
                alert(`שגיאה בשמירת ההגדרות: ${data.error}`);
            }
        })
        .catch(error => {
            console.error('Error saving general settings:', error);
            alert('שגיאה בשמירת ההגדרות');
        });
    }
    
    // שמירת הגדרות API
    function saveApiSettings(e) {
        e.preventDefault();
        
        const token = localStorage.getItem('token');
        const formData = {
            rateLimit: document.getElementById('api-rate-limit').value,
            timeout: document.getElementById('api-timeout').value,
            webhookRetry: document.getElementById('webhook-retry').value,
            corsEnabled: document.getElementById('cors-enabled').checked,
            corsDomains: document.getElementById('cors-domains').value
        };
        
        fetch('/api/admin/settings/api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('הגדרות ה-API נשמרו בהצלחה');
            } else {
                alert(`שגיאה בשמירת ההגדרות: ${data.error}`);
            }
        })
        .catch(error => {
            console.error('Error saving API settings:', error);
            alert('שגיאה בשמירת ההגדרות');
        });
    }
    
    // פתיחת מודאל עריכת חבילה
    function openPlanModal(planId) {
        const token = localStorage.getItem('token');
        const modalTitle = document.getElementById('plan-modal-title');
        
        // עדכון כותרת המודאל לפי החבילה
        if (planId === 'basic') {
            modalTitle.textContent = 'עריכת חבילת בסיס';
        } else if (planId === 'pro') {
            modalTitle.textContent = 'עריכת חבילת פרו';
        } else if (planId === 'platinum') {
            modalTitle.textContent = 'עריכת חבילת פלטיניום';
        }
        
        // טעינת נתוני החבילה
        fetch(`/api/admin/plans/${planId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // מילוי הטופס בנתוני החבילה
                document.getElementById('plan-id').value = planId;
                document.getElementById('plan-name').value = data.plan.name || '';
                document.getElementById('plan-price').value = data.plan.price || '';
                document.getElementById('plan-messages').value = data.plan.maxMessages || '';
                document.getElementById('plan-connections').value = data.plan.maxConnections || '';
                
                // תכונות נוספות
                document.getElementById('plan-media').checked = data.plan.features?.media || false;
                document.getElementById('plan-webhooks').checked = data.plan.features?.webhooks || false;
                document.getElementById('plan-api-advanced').checked = data.plan.features?.advancedApi || false;
                document.getElementById('plan-statistics').checked = data.plan.features?.statistics || false;
                
                // הצגת המודאל
                planModal.style.display = 'block';
            } else {
                console.error('Error loading plan:', data.error);
                alert('שגיאה בטעינת נתוני החבילה');
            }
        })
        .catch(error => {
            console.error('Error loading plan:', error);
            alert('שגיאה בטעינת נתוני החבילה');
        });
    }
    
    // פתיחת מודאל עריכת תבנית אימייל
    function openTemplateModal(templateId) {
        const token = localStorage.getItem('token');
        const modalTitle = document.getElementById('template-modal-title');
        
        // עדכון כותרת המודאל לפי התבנית
        if (templateId === 'welcome') {
            modalTitle.textContent = 'עריכת תבנית אימייל ברוכים הבאים';
        } else if (templateId === 'reset-password') {
            modalTitle.textContent = 'עריכת תבנית אימייל איפוס סיסמה';
        } else if (templateId === 'invoice') {
            modalTitle.textContent = 'עריכת תבנית אימייל חשבונית';
        }
        
        // טעינת נתוני התבנית
        fetch(`/api/admin/email-templates/${templateId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // מילוי הטופס בנתוני התבנית
                document.getElementById('template-id').value = templateId;
                document.getElementById('template-subject').value = data.template.subject || '';
                document.getElementById('template-content').value = data.template.content || '';
                
                // הצגת המודאל
                templateModal.style.display = 'block';
            } else {
                console.error('Error loading template:', data.error);
                alert('שגיאה בטעינת נתוני התבנית');
            }
        })
        .catch(error => {
            console.error('Error loading template:', error);
            alert('שגיאה בטעינת נתוני התבנית');
        });
    }
    
    // שמירת חבילה
    function savePlan() {
        const token = localStorage.getItem('token');
        const planId = document.getElementById('plan-id').value;
        
        const formData = {
            name: document.getElementById('plan-name').value,
            price: document.getElementById('plan-price').value,
            maxMessages: document.getElementById('plan-messages').value,
            maxConnections: document.getElementById('plan-connections').value,
            features: {
                media: document.getElementById('plan-media').checked,
                webhooks: document.getElementById('plan-webhooks').checked,
                advancedApi: document.getElementById('plan-api-advanced').checked,
                statistics: document.getElementById('plan-statistics').checked
            }
        };
        
        fetch(`/api/admin/plans/${planId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('החבילה נשמרה בהצלחה');
                closePlanModal();
                // רענון הדף כדי להציג את השינויים
                location.reload();
            } else {
                document.getElementById('plan-form-result').innerHTML = `<div class="alert alert-error">${data.error}</div>`;
            }
        })
        .catch(error => {
            console.error('Error saving plan:', error);
            document.getElementById('plan-form-result').innerHTML = '<div class="alert alert-error">שגיאה בשמירת החבילה</div>';
        });
    }
    
    // שמירת תבנית אימייל
    function saveTemplate() {
        const token = localStorage.getItem('token');
        const templateId = document.getElementById('template-id').value;
        
        const formData = {
            subject: document.getElementById('template-subject').value,
            content: document.getElementById('template-content').value
        };
        
        fetch(`/api/admin/email-templates/${templateId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('תבנית האימייל נשמרה בהצלחה');
                closeTemplateModal();
            } else {
                document.getElementById('template-form-result').innerHTML = `<div class="alert alert-error">${data.error}</div>`;
            }
        })
        .catch(error => {
            console.error('Error saving template:', error);
            document.getElementById('template-form-result').innerHTML = '<div class="alert alert-error">שגיאה בשמירת התבנית</div>';
        });
    }
    
    // סגירת מודאל חבילה
    function closePlanModal() {
        planModal.style.display = 'none';
        document.getElementById('plan-form-result').innerHTML = '';
    }
    
    // סגירת מודאל תבנית
    function closeTemplateModal() {
        templateModal.style.display = 'none';
        document.getElementById('template-form-result').innerHTML = '';
    }
    
    // ניקוי מטמון
    function clearCache() {
        const token = localStorage.getItem('token');
        
        if (confirm('האם אתה בטוח שברצונך לנקות את המטמון?')) {
            fetch('/api/admin/maintenance/clear-cache', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('המטמון נוקה בהצלחה');
                    // רענון הלוגים
                    refreshLogs();
                } else {
                    alert(`שגיאה בניקוי המטמון: ${data.error}`);
                }
            })
            .catch(error => {
                console.error('Error clearing cache:', error);
                alert('שגיאה בניקוי המטמון');
            });
        }
    }
    
    // יצירת גיבוי
    function createBackup() {
        const token = localStorage.getItem('token');
        
        fetch('/api/admin/maintenance/backup', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('גיבוי נוצר בהצלחה');
                // רענון הלוגים
                refreshLogs();
            } else {
                alert(`שגיאה ביצירת גיבוי: ${data.error}`);
            }
        })
        .catch(error => {
            console.error('Error creating backup:', error);
            alert('שגיאה ביצירת גיבוי');
        });
    }
    
    // סנכרון חיבורים
    function syncConnections() {
        const token = localStorage.getItem('token');
        
        fetch('/api/admin/maintenance/sync-connections', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('חיבורים סונכרנו בהצלחה');
                // רענון הלוגים
                refreshLogs();
            } else {
                alert(`שגיאה בסנכרון חיבורים: ${data.error}`);
            }
        })
        .catch(error => {
            console.error('Error syncing connections:', error);
            alert('שגיאה בסנכרון חיבורים');
        });
    }
    
    // החלפת מצב תחזוקה
    function toggleMaintenanceMode() {
        const token = localStorage.getItem('token');
        
        if (confirm('האם אתה בטוח שברצונך להחליף את מצב התחזוקה?')) {
            fetch('/api/admin/maintenance/toggle-mode', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const mode = data.maintenanceMode ? 'הופעל' : 'הופסק';
                    alert(`מצב תחזוקה ${mode} בהצלחה`);
                    
                    // עדכון כפתור המצב
                    if (data.maintenanceMode) {
                        maintenanceModeBtn.innerHTML = '<i class="fas fa-lock-open"></i> ביטול מצב תחזוקה';
                    } else {
                        maintenanceModeBtn.innerHTML = '<i class="fas fa-tools"></i> מצב תחזוקה';
                    }
                    
                    // רענון הלוגים
                    refreshLogs();
                } else {
                    alert(`שגיאה בהחלפת מצב תחזוקה: ${data.error}`);
                }
            })
            .catch(error => {
                console.error('Error toggling maintenance mode:', error);
                alert('שגיאה בהחלפת מצב תחזוקה');
            });
        }
    }
    
    // רענון לוגים
    function refreshLogs() {
        const token = localStorage.getItem('token');
        const logContent = document.querySelector('.log-content');
        const level = logLevel.value;
        
        fetch(`/api/admin/logs?level=${level}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderLogs(data.logs);
            } else {
                logContent.innerHTML = '<div class="no-logs">שגיאה בטעינת הלוגים</div>';
                console.error('Error loading logs:', data.error);
            }
        })
        .catch(error => {
            logContent.innerHTML = '<div class="no-logs">שגיאה בטעינת הלוגים</div>';
            console.error('Error loading logs:', error);
        });
    }
    
    // סינון לוגים לפי רמה
    function filterLogs() {
        refreshLogs();
    }
    
    // רינדור לוגים
    function renderLogs(logs) {
        const logContent = document.querySelector('.log-content');
        
        if (!logs || logs.length === 0) {
            logContent.innerHTML = '<div class="no-logs">לא נמצאו לוגים</div>';
            return;
        }
        
        let html = '';
        
        logs.forEach(log => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString('he-IL');
            
            html += `
                <div class="log-item ${log.level}">
                    <span class="log-time">${timeStr}</span>
                    <span class="log-level">${getLogLevelName(log.level)}</span>
                    <span class="log-message">${log.message}</span>
                </div>
            `;
        });
        
        logContent.innerHTML = html;
    }
    
    // המרת רמת לוג לשם בעברית
    function getLogLevelName(level) {
        const levels = {
            'error': 'שגיאה',
            'warning': 'אזהרה',
            'info': 'מידע',
            'debug': 'דיבאג'
        };
        
        return levels[level] || level;
    }
    
    // התנתקות
    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        window.location.href = '/login.html';
    }
    
    // הוספת CSS מותאם
    const style = document.createElement('style');
    style.textContent = `
        .admin-settings-layout {
            display: flex;
            gap: 30px;
            margin-top: 20px;
        }
        
        .settings-sidebar {
            width: 250px;
            flex-shrink: 0;
        }
        
        .settings-content {
            flex-grow: 1;
        }
        
        .settings-nav {
            list-style: none;
            background-color: white;
            border-radius: 10px;
            box-shadow: var(--shadow);
            overflow: hidden;
        }
        
        .settings-nav a {
            display: block;
            padding: 15px 20px;
            border-bottom: 1px solid var(--gray);
            color: var(--dark-color);
            transition: var(--transition);
        }
        
        .settings-nav a:hover, 
        .settings-nav a.active {
            background-color: var(--primary-color);
            color: white;
        }
        
        .settings-nav li:last-child a {
            border-bottom: none;
        }
        
        .settings-tab {
            display: none;
            background-color: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: var(--shadow);
        }
        
        .settings-tab.active {
            display: block;
        }
        
        .settings-tab h3 {
            color: var(--dark-color);
            margin-bottom: 25px;
        }
        
        .settings-form {
            max-width: 600px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid var(--gray);
            border-radius: 5px;
            font-family: 'Noto Sans Hebrew', sans-serif;
        }
        
        .form-group small {
            display: block;
            margin-top: 5px;
            font-size: 0.85rem;
            color: var(--gray-dark);
        }
        
        .form-submit {
            margin-top: 30px;
        }
        
        /* Toggle Switch */
        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 24px;
            margin-right: 10px;
        }
        
        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        
        .toggle-switch label {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 24px;
        }
        
        .toggle-switch label:before {
            position: absolute;
            content: calc(100% - 4px);
            height: calc(100% - 4px);
            left: 2px;
            bottom: 2px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
            width: 20px;
        }
        
        .toggle-switch input:checked + label {
            background-color: var(--primary-color);
        }
        
        .toggle-switch input:checked + label:before {
            transform: translateX(26px);
        }
        
        /* Plans Styling */
        .plans-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .plan-card {
            background-color: white;
            border: 1px solid var(--gray);
            border-radius: 10px;
            overflow: hidden;
            transition: var(--transition);
        }
        
        .plan-card:hover {
            box-shadow: var(--shadow);
            transform: translateY(-3px);
        }
        
        .plan-header {
            padding: 15px;
            background-color: var(--gray-light);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .plan-header h4 {
            margin: 0;
            color: var(--dark-color);
        }
        
        .plan-actions {
            display: flex;
            gap: 5px;
        }
        
        .btn-icon {
            background: none;
            border: none;
            font-size: 1rem;
            padding: 5px;
            cursor: pointer;
            color: var(--gray-dark);
            transition: var(--transition);
        }
        
        .btn-icon:hover {
            color: var(--primary-color);
        }
        
        .plan-details {
            padding: 15px;
        }
        
        .plan-price {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 15px;
            color: var(--dark-color);
        }
        
        .plan-features {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .plan-features li {
            padding: 8px 0;
            border-bottom: 1px solid var(--gray);
            position: relative;
            padding-right: 25px;
        }
        
        .plan-features li:last-child {
            border-bottom: none;
        }
        
        .plan-features li:before {
            content: '✓';
            color: var(--success-color);
            position: absolute;
            right: 0;
        }
        
        /* Email Templates */
        .email-templates {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .template-item {
            background-color: white;
            border: 1px solid var(--gray);
            border-radius: 10px;
            overflow: hidden;
            transition: var(--transition);
        }
        
        .template-item:hover {
            box-shadow: var(--shadow);
        }
        
        .template-header {
            padding: 15px;
            background-color: var(--gray-light);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .template-header h4 {
            margin: 0;
            color: var(--dark-color);
        }
        
        .template-preview {
            padding: 15px;
        }
        
        /* Maintenance Section */
        .maintenance-section {
            margin-bottom: 30px;
        }
        
        .maintenance-section h4 {
            margin-bottom: 15px;
            color: var(--dark-color);
        }
        
        .system-status {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .status-item {
            padding: 10px 15px;
            background-color: var(--gray-light);
            border-radius: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .status-label {
            font-weight: 500;
        }
        
        .status-value {
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 0.85rem;
            font-weight: 600;
        }
        
        .status-value.online {
            background-color: rgba(76, 175, 80, 0.2);
            color: var(--success-color);
        }
        
        .status-value.offline {
            background-color: rgba(244, 67, 54, 0.2);
            color: var(--error-color);
        }
        
        .maintenance-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .maintenance-actions .btn {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .maintenance-actions .danger {
            border-color: var(--error-color);
            color: var(--error-color);
        }
        
        .maintenance-actions .danger:hover {
            background-color: var(--error-color);
            color: white;
        }
        
        /* Log Section */
        .system-log {
            background-color: var(--gray-light);
            border-radius: 5px;
            overflow: hidden;
        }
        
        .log-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 15px;
            background-color: white;
            border-bottom: 1px solid var(--gray);
        }
        
        .log-content {
            padding: 10px;
            max-height: 300px;
            overflow-y: auto;
        }
        
        .log-item {
            padding: 8px 10px;
            margin-bottom: 5px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
        }
        
        .log-item.error {
            background-color: rgba(244, 67, 54, 0.1);
        }
        
        .log-item.warning {
            background-color: rgba(255, 152, 0, 0.1);
        }
        
        .log-item.info {
            background-color: rgba(33, 150, 243, 0.1);
        }
        
        .log-time {
            width: 80px;
            color: var(--gray-dark);
        }
        
        .log-level {
            width: 60px;
            font-weight: 600;
            margin: 0 10px;
        }
        
        .log-item.error .log-level {
            color: var(--error-color);
        }
        
        .log-item.warning .log-level {
            color: var(--warning-color);
        }
        
        .log-item.info .log-level {
            color: var(--secondary-color);
        }
        
        .log-message {
            flex-grow: 1;
        }
        
        .no-logs {
            text-align: center;
            padding: 20px;
            color: var(--gray-dark);
        }
        
        /* Checkbox Group */
        .checkbox-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .checkbox-option {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .admin-settings-layout {
                flex-direction: column;
            }
            
            .settings-sidebar {
                width: 100%;
                margin-bottom: 20px;
            }
            
            .settings-nav {
                display: flex;
                flex-wrap: wrap;
            }
            
            .settings-nav a {
                padding: 10px 15px;
                border-bottom: none;
                border-left: 1px solid var(--gray);
            }
            
            .settings-nav li:last-child a {
                border-left: none;
            }
            
            .plans-container,
            .system-status {
                grid-template-columns: 1fr;
            }
        }
    `;
    document.head.appendChild(style);
});