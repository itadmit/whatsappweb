document.addEventListener('DOMContentLoaded', function() {
    // בדיקה אם המשתמש מחובר ובעל הרשאות מנהל
    checkAdminAuthentication();
    
    // אלמנטים בדף
    const usersList = document.getElementById('users-list');
    const searchInput = document.getElementById('search-users');
    const filterPlan = document.getElementById('filter-plan');
    const filterStatus = document.getElementById('filter-status');
    const createUserBtn = document.getElementById('create-user-btn');
    const userModal = document.getElementById('user-modal');
    const closeBtn = document.querySelector('.close-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const saveUserBtn = document.getElementById('save-user-btn');
    const userForm = document.getElementById('user-form');
    const modalTitle = document.getElementById('modal-title');
    const userId = document.getElementById('user-id');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const currentPageSpan = document.getElementById('current-page');
    const totalPagesSpan = document.getElementById('total-pages');
    const logoutBtn = document.getElementById('logout-btn');
    
    // משתנים גלובלים
    let currentPage = 1;
    let totalPages = 1;
    let searchTerm = '';
    let planFilter = '';
    let statusFilter = '';
    
    // טעינה ראשונית של נתונים
    loadUsers();
    
    // אירועי לחיצה
    if (createUserBtn) createUserBtn.addEventListener('click', openCreateUserModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (saveUserBtn) saveUserBtn.addEventListener('click', saveUser);
    if (searchInput) searchInput.addEventListener('input', handleSearch);
    if (filterPlan) filterPlan.addEventListener('change', handleFilterChange);
    if (filterStatus) filterStatus.addEventListener('change', handleFilterChange);
    if (prevPageBtn) prevPageBtn.addEventListener('click', goToPrevPage);
    if (nextPageBtn) nextPageBtn.addEventListener('click', goToNextPage);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    
    // סגירת מודאל בלחיצה מחוץ למודאל
    window.addEventListener('click', function(event) {
        if (event.target === userModal) {
            closeModal();
        }
    });
    
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
    
    // טעינת רשימת משתמשים
    function loadUsers() {
        const token = localStorage.getItem('token');
        
        // הצגת אנימציית טעינה
        usersList.innerHTML = '<tr><td colspan="7" style="text-align: center;">טוען משתמשים...</td></tr>';
        
        // בניית פרמטרים לשאילתה
        let queryParams = `?page=${currentPage}`;
        if (searchTerm) queryParams += `&search=${encodeURIComponent(searchTerm)}`;
        if (planFilter) queryParams += `&plan=${encodeURIComponent(planFilter)}`;
        if (statusFilter) queryParams += `&status=${encodeURIComponent(statusFilter)}`;
        
        fetch(`/api/admin/users${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // עדכון נתוני עימוד
                totalPages = data.pagination.totalPages || 1;
                currentPage = data.pagination.currentPage || 1;
                currentPageSpan.textContent = currentPage;
                totalPagesSpan.textContent = totalPages;
                
                // הצגת/הסתרת כפתורי דפדוף
                prevPageBtn.disabled = currentPage <= 1;
                nextPageBtn.disabled = currentPage >= totalPages;
                
                // רינדור רשימת המשתמשים
                renderUsersList(data.users);
            } else {
                usersList.innerHTML = '<tr><td colspan="7" style="text-align: center;">שגיאה בטעינת נתונים</td></tr>';
                console.error('Error loading users:', data.error);
            }
        })
        .catch(error => {
            usersList.innerHTML = '<tr><td colspan="7" style="text-align: center;">שגיאה בטעינת נתונים</td></tr>';
            console.error('Error loading users:', error);
        });
    }
    
    // רינדור רשימת משתמשים
    function renderUsersList(users) {
        if (!users || users.length === 0) {
            usersList.innerHTML = '<tr><td colspan="7" style="text-align: center;">לא נמצאו משתמשים</td></tr>';
            return;
        }
        
        let html = '';
        
        users.forEach(user => {
            const createdAt = new Date(user.createdAt).toLocaleDateString('he-IL');
            const statusClass = user.active ? 'success' : 'error';
            const statusText = user.active ? 'פעיל' : 'לא פעיל';
            
            html += `
                <tr data-id="${user._id}">
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>${user.phone}</td>
                    <td>${getPlanDisplayName(user.plan)}</td>
                    <td><span class="status-${statusClass}">${statusText}</span></td>
                    <td>${createdAt}</td>
                    <td>
                        <button class="btn-icon edit" onclick="editUser('${user._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete" onclick="deleteUser('${user._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        usersList.innerHTML = html;
    }
    
    // פתיחת מודאל יצירת משתמש חדש
    function openCreateUserModal() {
        modalTitle.textContent = 'הוספת משתמש חדש';
        userForm.reset();
        userId.value = '';
        
        // הגדרת ברירות מחדל
        document.getElementById('role-user').checked = true;
        document.getElementById('plan-basic').checked = true;
        document.getElementById('user-status').value = 'active';
        
        userModal.style.display = 'block';
    }
    
    // פתיחת מודאל עריכת משתמש
    window.editUser = function(id) {
        const token = localStorage.getItem('token');
        
        // שינוי כותרת המודאל
        modalTitle.textContent = 'עריכת משתמש';
        
        // טעינת נתוני המשתמש
        fetch(`/api/admin/users/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const user = data.user;
                
                // הצבת ערכים בטופס
                userId.value = user._id;
                document.getElementById('user-name').value = user.name;
                document.getElementById('user-email').value = user.email;
                document.getElementById('user-password').value = ''; // לא מציגים סיסמה
                document.getElementById('user-phone').value = user.phone;
                
                // הגדרת חבילה
                document.querySelector(`input[name="user-plan"][value="${user.plan}"]`).checked = true;
                
                // הגדרת תפקיד
                document.querySelector(`input[name="user-role"][value="${user.role}"]`).checked = true;
                
                // הגדרת סטטוס
                document.getElementById('user-status').value = user.active ? 'active' : 'inactive';
                
                // הצגת המודאל
                userModal.style.display = 'block';
            } else {
                alert('שגיאה בטעינת נתוני המשתמש');
                console.error('Error loading user:', data.error);
            }
        })
        .catch(error => {
            alert('שגיאה בטעינת נתוני המשתמש');
            console.error('Error loading user:', error);
        });
    };
    
    // מחיקת משתמש
    window.deleteUser = function(id) {
        if (!confirm('האם אתה בטוח שברצונך למחוק משתמש זה?')) {
            return;
        }
        
        const token = localStorage.getItem('token');
        
        fetch(`/api/admin/users/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('המשתמש נמחק בהצלחה');
                loadUsers();
            } else {
                alert(`שגיאה במחיקת המשתמש: ${data.error}`);
                console.error('Error deleting user:', data.error);
            }
        })
        .catch(error => {
            alert('שגיאה במחיקת המשתמש');
            console.error('Error deleting user:', error);
        });
    };
    
    // שמירת משתמש (יצירה או עדכון)
    function saveUser() {
        const token = localStorage.getItem('token');
        const formResult = document.getElementById('form-result');
        
        // איסוף נתונים מהטופס
        const formData = {
            name: document.getElementById('user-name').value,
            email: document.getElementById('user-email').value,
            phone: document.getElementById('user-phone').value,
            plan: document.querySelector('input[name="user-plan"]:checked').value,
            role: document.querySelector('input[name="user-role"]:checked').value,
            active: document.getElementById('user-status').value === 'active'
        };
        
        // סיסמה (אופציונלי בעדכון)
        const password = document.getElementById('user-password').value;
        if (password) {
            formData.password = password;
        }
        
        const isUpdate = userId.value ? true : false;
        const url = isUpdate ? `/api/admin/users/${userId.value}` : '/api/admin/users';
        const method = isUpdate ? 'PUT' : 'POST';
        
        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(isUpdate ? 'המשתמש עודכן בהצלחה' : 'המשתמש נוצר בהצלחה');
                closeModal();
                loadUsers();
            } else {
                formResult.innerHTML = `<div class="alert alert-error">${data.error}</div>`;
            }
        })
        .catch(error => {
            formResult.innerHTML = '<div class="alert alert-error">שגיאה בשמירת הנתונים</div>';
            console.error('Error saving user:', error);
        });
    }
    
    // סגירת מודאל
    function closeModal() {
        userModal.style.display = 'none';
        document.getElementById('form-result').innerHTML = '';
    }
    
    // חיפוש משתמשים
    function handleSearch() {
        searchTerm = searchInput.value.trim();
        currentPage = 1; // חזרה לדף ראשון
        loadUsers();
    }
    
    // סינון לפי פרמטרים
    function handleFilterChange() {
        planFilter = filterPlan.value;
        statusFilter = filterStatus.value;
        currentPage = 1; // חזרה לדף ראשון
        loadUsers();
    }
    
    // דף קודם
    function goToPrevPage() {
        if (currentPage > 1) {
            currentPage--;
            loadUsers();
        }
    }
    
    // דף הבא
    function goToNextPage() {
        if (currentPage < totalPages) {
            currentPage++;
            loadUsers();
        }
    }
    
    // המרת מזהה חבילה לשם תצוגה
    function getPlanDisplayName(plan) {
        const plans = {
            'basic': 'בסיס',
            'pro': 'פרו',
            'platinum': 'פלטיניום'
        };
        
        return plans[plan] || plan;
    }
    
    // התנתקות
    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        window.location.href = '/login.html';
    }
    
    // הוספת CSS לסטטוס
    const style = document.createElement('style');
    style.textContent = `
        .status-success {
            color: var(--success-color);
            font-weight: 600;
        }
        .status-error {
            color: var(--error-color);
            font-weight: 600;
        }
        .alert {
            padding: 10px;
            border-radius: 5px;
            margin-top: 10px;
        }
        .alert-error {
            background-color: rgba(244, 67, 54, 0.1);
            color: var(--error-color);
            border: 1px solid var(--error-color);
        }
    `;
    document.head.appendChild(style);
});