document.addEventListener('DOMContentLoaded', function() {
    // בדיקה אם המשתמש מחובר ובעל הרשאות מנהל
    checkAdminAuthentication();
    
    // אלמנטים בדף
    const dateRangeSelect = document.getElementById('date-range');
    const totalUsersElement = document.getElementById('total-users');
    const newUsersElement = document.getElementById('new-users');
    const totalMessagesElement = document.getElementById('total-messages');
    const activeConnectionsElement = document.getElementById('active-connections');
    const activeUsersList = document.getElementById('active-users-list');
    const logoutBtn = document.getElementById('logout-btn');
    
    // משתנים לגרפים
    let usersChart, messagesChart, plansChart;
    
    // טעינה ראשונית של נתונים
    loadStatistics(dateRangeSelect.value);
    
    // אירועי לחיצה
    if (dateRangeSelect) dateRangeSelect.addEventListener('change', function() {
        loadStatistics(this.value);
    });
    
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
    
    // טעינת סטטיסטיקות
    function loadStatistics(dateRange) {
        const token = localStorage.getItem('token');
        
        // הצגת אנימציית טעינה
        totalUsersElement.textContent = '...';
        newUsersElement.textContent = '...';
        totalMessagesElement.textContent = '...';
        activeConnectionsElement.textContent = '...';
        activeUsersList.innerHTML = '<tr><td colspan="4" style="text-align: center;">טוען נתונים...</td></tr>';
        
        fetch(`/api/admin/statistics?range=${dateRange}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // עדכון נתונים כלליים
                updateOverviewStats(data.stats);
                
                // עדכון גרפים
                updateCharts(data.charts);
                
                // רינדור משתמשים פעילים
                renderActiveUsers(data.activeUsers);
            } else {
                console.error('Error loading statistics:', data.error);
                alert('שגיאה בטעינת נתונים');
            }
        })
        .catch(error => {
            console.error('Error loading statistics:', error);
            alert('שגיאה בטעינת נתונים');
        });
    }
    
    // עדכון נתונים כלליים
    function updateOverviewStats(stats) {
        totalUsersElement.textContent = stats.totalUsers.toLocaleString();
        newUsersElement.textContent = stats.newUsers.toLocaleString();
        totalMessagesElement.textContent = stats.totalMessages.toLocaleString();
        activeConnectionsElement.textContent = stats.activeConnections.toLocaleString();
    }
    
    // עדכון גרפים
    function updateCharts(chartData) {
        // יצירת/עדכון גרף משתמשים
        updateUsersChart(chartData.users);
        
        // יצירת/עדכון גרף הודעות
        updateMessagesChart(chartData.messages);
        
        // יצירת/עדכון גרף חבילות
        updatePlansChart(chartData.plans);
    }
    
    // עדכון גרף משתמשים
    function updateUsersChart(data) {
        const ctx = document.getElementById('users-chart').getContext('2d');
        
        // השמדת גרף קיים אם יש
        if (usersChart) {
            usersChart.destroy();
        }
        
        // יצירת גרף חדש
        usersChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'משתמשים חדשים',
                        data: data.newUsers,
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'סה"כ משתמשים',
                        data: data.totalUsers,
                        borderColor: '#2196F3',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });
    }
    
    // עדכון גרף הודעות
    function updateMessagesChart(data) {
        const ctx = document.getElementById('messages-chart').getContext('2d');
        
        // השמדת גרף קיים אם יש
        if (messagesChart) {
            messagesChart.destroy();
        }
        
// יצירת גרף חדש
messagesChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: data.labels,
        datasets: [
            {
                label: 'הודעות שנשלחו',
                data: data.sent,
                backgroundColor: 'rgba(33, 150, 243, 0.6)',
                borderColor: '#2196F3',
                borderWidth: 1
            },
            {
                label: 'הודעות שהתקבלו',
                data: data.received,
                backgroundColor: 'rgba(156, 39, 176, 0.6)',
                borderColor: '#9C27B0',
                borderWidth: 1
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true
            }
        },
        plugins: {
            tooltip: {
                mode: 'index',
                intersect: false
            }
        }
    }
});
}

// עדכון גרף חבילות
function updatePlansChart(data) {
const ctx = document.getElementById('plans-chart').getContext('2d');

// השמדת גרף קיים אם יש
if (plansChart) {
    plansChart.destroy();
}

// הגדרת צבעים לחבילות
const colors = {
    'basic': '#8BC34A',    // ירוק בהיר
    'pro': '#FF9800',      // כתום
    'platinum': '#9C27B0'  // סגול
};

// המרת נתונים לפורמט המתאים לגרף עוגה
const chartData = {
    labels: Object.keys(data).map(key => getPlanDisplayName(key)),
    datasets: [{
        data: Object.values(data),
        backgroundColor: Object.keys(data).map(key => colors[key] || '#607D8B'),
        borderWidth: 1
    }]
};

// יצירת גרף חדש
plansChart = new Chart(ctx, {
    type: 'doughnut',
    data: chartData,
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right'
            }
        }
    }
});
}

// רינדור רשימת משתמשים פעילים
function renderActiveUsers(users) {
if (!users || users.length === 0) {
    activeUsersList.innerHTML = '<tr><td colspan="4" style="text-align: center;">לא נמצאו משתמשים פעילים</td></tr>';
    return;
}

let html = '';

users.forEach(user => {
    const lastActive = new Date(user.lastActive).toLocaleString('he-IL');
    
    html += `
        <tr>
            <td>
                <div class="user-info">
                    <strong>${user.name}</strong>
                    <span>${user.email}</span>
                </div>
            </td>
            <td>${getPlanDisplayName(user.plan)}</td>
            <td>${user.messageCount.toLocaleString()}</td>
            <td>${lastActive}</td>
        </tr>
    `;
});

activeUsersList.innerHTML = html;
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

// הוספת CSS לטבלה
const style = document.createElement('style');
style.textContent = `
.stats-overview {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.stats-card {
    background-color: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: var(--shadow);
    display: flex;
    align-items: center;
    gap: 15px;
}

.stats-icon {
    font-size: 1.8rem;
    color: var(--primary-color);
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(37, 211, 102, 0.1);
    border-radius: 50%;
}

.stats-info h3 {
    font-size: 1.8rem;
    margin-bottom: 5px;
    color: var(--dark-color);
}

.stats-info p {
    color: var(--gray-dark);
    font-size: 0.9rem;
}

.admin-dashboard {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 20px;
}

.dashboard-section {
    background-color: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: var(--shadow);
    margin-bottom: 20px;
}

.dashboard-section h3 {
    margin-bottom: 20px;
    color: var(--dark-color);
    font-size: 1.2rem;
}

.chart-container {
    position: relative;
    height: 300px;
}

.admin-table {
    width: 100%;
    border-collapse: collapse;
}

.admin-table th, 
.admin-table td {
    padding: 12px;
    border-bottom: 1px solid var(--gray);
    text-align: right;
}

.admin-table th {
    font-weight: 600;
    color: var(--dark-color);
    background-color: var(--gray-light);
}

.user-info {
    display: flex;
    flex-direction: column;
}

.user-info strong {
    margin-bottom: 3px;
}

.user-info span {
    font-size: 0.85rem;
    color: var(--gray-dark);
}

@media (max-width: 768px) {
    .admin-dashboard {
        grid-template-columns: 1fr;
    }
}
`;
document.head.appendChild(style);
});