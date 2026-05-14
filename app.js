// ==================== CHEZIYA HIGH SCHOOL EMPLOYEE SYSTEM ====================
// Firebase placeholders: Use firebase.auth() and firestore instead of localStorage
// All data stored in localStorage for demo; replace with Firestore calls.

// ---------- Seed demo data ----------
function seedData() {
  if (!localStorage.getItem('cheziya_users')) {
    const users = [
      { id: 'u1', username: 'admin', password: 'admin123', role: 'admin', name: 'Admin User', email: 'admin@cheziya.ac.zw' },
      { id: 'u2', username: 'principal', password: 'principal123', role: 'principal', name: 'Dr. Moyo', email: 'principal@cheziya.ac.zw' },
      { id: 'u3', username: 'teacher', password: 'teacher123', role: 'teacher', name: 'Mrs. Ndlovu', email: 'ndlovu@cheziya.ac.zw', department: 'Sciences', subjects: ['Biology','Chemistry'], hod: 'Dr. Moyo', extraRoles: ['Class Teacher'] }
    ];
    localStorage.setItem('cheziya_users', JSON.stringify(users));
    localStorage.setItem('cheziya_employees', JSON.stringify(users.filter(u => u.role !== 'admin'))); // simplified
    const departments = [
      { name: 'Humanities', subjects: ['History','Heritage Studies','FRS'], hod: null },
      { name: 'Sciences', subjects: ['Mathematics','Biology','Chemistry','Physics'], hod: 'Dr. Moyo' },
      { name: 'Commercials', subjects: ['Accounting','Business Studies'], hod: null },
      { name: 'Languages', subjects: ['English','Shona','French'], hod: null },
      { name: 'Sports', subjects: ['Physical Education'], hod: null }
    ];
    localStorage.setItem('cheziya_departments', JSON.stringify(departments));
    localStorage.setItem('cheziya_leave', JSON.stringify([]));
    localStorage.setItem('cheziya_attendance', JSON.stringify([]));
    localStorage.setItem('cheziya_announcements', JSON.stringify([
      { id: 'a1', title: 'Staff Meeting', content: 'All staff meeting on Friday 8am.', author: 'Principal', date: '2026-05-10' }
    ]));
  }
}
seedData();

// ---------- Global State ----------
let currentUser = null;
let currentPage = 'dashboard';

// ---------- Helper Functions ----------
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function openModal(title, bodyHTML) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalOverlay').style.display = 'flex';
}
function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
}
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

// ---------- Login Logic ----------
document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const role = document.getElementById('loginRole').value;
  const users = JSON.parse(localStorage.getItem('cheziya_users'));
  const user = users.find(u => u.username === username && u.password === password && u.role === role);
  if (user) {
    currentUser = user;
    // Simulate session (Firebase Auth would set persistence)
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    setupDashboard();
    showToast(`Welcome, ${user.name}!`, 'success');
  } else {
    document.getElementById('loginError').textContent = 'Invalid credentials or role.';
  }
});
// Password toggle
document.getElementById('toggleLoginPassword').addEventListener('click', function() {
  const pw = document.getElementById('loginPassword');
  pw.type = pw.type === 'password' ? 'text' : 'password';
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  currentUser = null;
  sessionStorage.removeItem('currentUser');
  document.getElementById('appContainer').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginForm').reset();
  showToast('Logged out.');
});

// ---------- Dashboard Setup & Navigation ----------
function setupDashboard() {
  updateUIForRole();
  renderPage('dashboard');
  updateNotifications();
  // Navigation events
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const page = this.dataset.page;
      if (!page) return;
      // Role-based access control
      if (currentUser.role === 'teacher' && ['employees','departments','reports'].includes(page)) {
        showToast('Access denied.', 'error');
        return;
      }
      if (currentUser.role === 'principal' && ['employees','departments'].includes(page)) {
        showToast('Access denied.', 'error');
        return;
      }
      setActiveNav(page);
      renderPage(page);
    });
  });
  document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
  document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
}

function updateUIForRole() {
  document.getElementById('userNameDisplay').textContent = currentUser.name;
  document.getElementById('userRoleBadge').textContent = currentUser.role.toUpperCase();
  // Show/hide nav items
  const teacherHidden = ['navEmployees','navDepartments','navReports'];
  teacherHidden.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (currentUser.role === 'teacher' || currentUser.role === 'principal') ? 'none' : 'flex';
  });
  if (currentUser.role === 'principal') {
    document.getElementById('navEmployees').style.display = 'none';
    document.getElementById('navDepartments').style.display = 'none';
  }
}

function setActiveNav(page) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  const active = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (active) active.classList.add('active');
  document.getElementById('navbarTitle').textContent = page.charAt(0).toUpperCase() + page.slice(1);
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('active');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

// ---------- Page Rendering ----------
function renderPage(page) {
  currentPage = page;
  const content = document.getElementById('contentArea');
  switch(page) {
    case 'dashboard': content.innerHTML = renderDashboard(); break;
    case 'employees': content.innerHTML = renderEmployees(); break;
    case 'departments': content.innerHTML = renderDepartments(); break;
    case 'leave': content.innerHTML = renderLeave(); break;
    case 'attendance': content.innerHTML = renderAttendance(); break;
    case 'announcements': content.innerHTML = renderAnnouncements(); break;
    case 'reports': content.innerHTML = renderReports(); break;
    case 'profile': content.innerHTML = renderProfile(); break;
    default: content.innerHTML = '<p>Page not found.</p>';
  }
}

function renderDashboard() {
  const employees = JSON.parse(localStorage.getItem('cheziya_employees') || '[]');
  const depts = JSON.parse(localStorage.getItem('cheziya_departments') || '[]');
  const leaveApps = JSON.parse(localStorage.getItem('cheziya_leave') || '[]');
  const pendingLeaves = leaveApps.filter(l => l.status === 'pending').length;
  return `
    <div class="card"><h3>Welcome, ${currentUser.name}!</h3><p>Role: ${currentUser.role.toUpperCase()}</p></div>
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap:1rem;">
      <div class="card"><h2>${employees.length}</h2><p>Total Employees</p></div>
      <div class="card"><h2>${depts.length}</h2><p>Departments</p></div>
      <div class="card"><h2>${pendingLeaves}</h2><p>Pending Leaves</p></div>
    </div>
  `;
}

function renderEmployees() {
  if (currentUser.role === 'teacher') return '<p>Access denied.</p>';
  const employees = JSON.parse(localStorage.getItem('cheziya_employees') || '[]');
  let rows = employees.map(emp => `
    <tr>
      <td>${emp.name}</td><td>${emp.role}</td><td>${emp.department || '-'}</td>
      <td>${emp.email}</td>
      <td><button class="btn btn-sm btn-outline" onclick="viewEmployee('${emp.id}')">View</button></td>
    </tr>`).join('');
  return `<div class="card"><div class="card-header"><h3>Employees</h3><button class="btn btn-primary" onclick="openAddEmployeeModal()">+ Add</button></div>
    <div class="table-responsive"><table><thead><tr><th>Name</th><th>Role</th><th>Dept</th><th>Email</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

function openAddEmployeeModal() {
  const depts = JSON.parse(localStorage.getItem('cheziya_departments') || '[]');
  const deptOptions = depts.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
  openModal('Add Employee', `
    <form id="addEmpForm" class="form-grid">
      <div class="form-group"><label>Full Name</label><input name="name" required></div>
      <div class="form-group"><label>Employee ID</label><input name="empId" required></div>
      <div class="form-group"><label>National ID</label><input name="natId"></div>
      <div class="form-group"><label>Gender</label><select name="gender"><option>Male</option><option>Female</option></select></div>
      <div class="form-group"><label>Phone</label><input name="phone"></div>
      <div class="form-group"><label>Email</label><input name="email" type="email"></div>
      <div class="form-group"><label>Department</label><select name="department">${deptOptions}</select></div>
      <div class="form-group"><label>Position</label><input name="position" value="Teacher"></div>
      <button type="submit" class="btn btn-success btn-block" style="grid-column:span 2">Save</button>
    </form>
  `);
  document.getElementById('addEmpForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const emp = Object.fromEntries(formData.entries());
    emp.id = 'emp_' + Date.now();
    emp.role = 'teacher';
    let employees = JSON.parse(localStorage.getItem('cheziya_employees') || '[]');
    employees.push(emp);
    localStorage.setItem('cheziya_employees', JSON.stringify(employees));
    closeModal();
    renderPage('employees');
    showToast('Employee added!');
  });
}

function viewEmployee(id) {
  const employees = JSON.parse(localStorage.getItem('cheziya_employees') || '[]');
  const emp = employees.find(e => e.id === id);
  if (!emp) return;
  openModal('Employee Profile', `<p><strong>Name:</strong> ${emp.name}</p><p>Email: ${emp.email}</p>`);
}

// Departments (simplified)
function renderDepartments() {
  const depts = JSON.parse(localStorage.getItem('cheziya_departments') || '[]');
  let html = depts.map(d => `<div class="card"><h4>${d.name}</h4><p>Subjects: ${d.subjects.join(', ')}</p><p>HOD: ${d.hod || 'None'}</p></div>`).join('');
  return `<h3>Departments</h3>${html}`;
}

// Leave Management
function renderLeave() {
  const leaves = JSON.parse(localStorage.getItem('cheziya_leave') || '[]');
  let rows = leaves.map(l => `<tr><td>${l.teacher}</td><td>${l.type}</td><td>${l.start} to ${l.end}</td><td><span class="badge-status status-${l.status}">${l.status}</span></td>
    ${(currentUser.role==='admin'||currentUser.role==='principal') ? `<td><button onclick="updateLeave('${l.id}','approved')">Approve</button> <button onclick="updateLeave('${l.id}','rejected')">Reject</button></td>` : ''}</tr>`).join('');
  return `<div class="card"><button class="btn btn-primary" onclick="applyLeaveModal()">+ Apply Leave</button>
    <div class="table-responsive"><table><thead><tr><th>Teacher</th><th>Type</th><th>Dates</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}
function applyLeaveModal() {
  openModal('Apply Leave', `<form id="leaveForm"><input name="type" placeholder="Sick/Vacation" required><input name="start" type="date" required><input name="end" type="date" required><button type="submit">Submit</button></form>`);
  document.getElementById('leaveForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const leave = { id: 'l_'+Date.now(), teacher: currentUser.name, type: fd.get('type'), start: fd.get('start'), end: fd.get('end'), status:'pending' };
    let leaves = JSON.parse(localStorage.getItem('cheziya_leave') || '[]');
    leaves.push(leave);
    localStorage.setItem('cheziya_leave', JSON.stringify(leaves));
    closeModal(); renderPage('leave'); showToast('Leave applied');
  });
}
function updateLeave(id, status) {
  let leaves = JSON.parse(localStorage.getItem('cheziya_leave') || '[]');
  const idx = leaves.findIndex(l => l.id===id);
  if(idx>-1) { leaves[idx].status = status; localStorage.setItem('cheziya_leave', JSON.stringify(leaves)); renderPage('leave'); }
}

// Attendance (clock in/out simulation)
function renderAttendance() {
  return `<div class="card"><button class="btn btn-success" onclick="clockInOut()">🕒 Clock In/Out</button>
    <p id="clockStatus">Not clocked in today.</p></div>`;
}
function clockInOut() {
  let att = JSON.parse(localStorage.getItem('cheziya_attendance') || '[]');
  const today = new Date().toISOString().slice(0,10);
  const existing = att.find(a => a.user===currentUser.name && a.date===today);
  if (!existing) {
    att.push({user:currentUser.name, date:today, clockIn: new Date().toLocaleTimeString(), clockOut:null});
    localStorage.setItem('cheziya_attendance', JSON.stringify(att));
    showToast('Clocked In');
  } else if(!existing.clockOut) {
    existing.clockOut = new Date().toLocaleTimeString();
    localStorage.setItem('cheziya_attendance', JSON.stringify(att));
    showToast('Clocked Out');
  }
  renderPage('attendance');
}

// Announcements
function renderAnnouncements() {
  const anns = JSON.parse(localStorage.getItem('cheziya_announcements') || '[]');
  let html = anns.map(a => `<div class="card"><h4>${a.title}</h4><p>${a.content}</p><small>${a.author} - ${a.date}</small></div>`).join('');
  if (currentUser.role === 'admin' || currentUser.role === 'principal') {
    html += `<button class="btn btn-primary" onclick="openAnnouncementModal()">+ New</button>`;
  }
  return html;
}
function openAnnouncementModal() { /* similar pattern */ }

// Reports (chart with plain JS)
function renderReports() {
  const depts = JSON.parse(localStorage.getItem('cheziya_departments') || '[]');
  const employees = JSON.parse(localStorage.getItem('cheziya_employees') || '[]');
  const deptCounts = depts.map(d => ({ name: d.name, count: employees.filter(e => e.department === d.name).length }));
  let chartHTML = '<div style="display:flex; gap:10px; align-items:flex-end; height:150px;">';
  deptCounts.forEach(d => {
    chartHTML += `<div style="width:40px; background:var(--primary); height:${d.count*20}px;" title="${d.name}: ${d.count}"></div>`;
  });
  chartHTML += '</div>';
  return `<div class="card"><h3>Teachers per Department</h3>${chartHTML}</div>`;
}

// Profile (teacher view)
function renderProfile() {
  return `<div class="card"><h3>My Profile</h3><p>Name: ${currentUser.name}</p><p>Role: ${currentUser.role}</p></div>`;
}

// Notifications
function updateNotifications() {
  const notifList = document.getElementById('notifList');
  const leaves = JSON.parse(localStorage.getItem('cheziya_leave') || '[]');
  const endingSoon = leaves.filter(l => l.status==='approved' && new Date(l.end) < new Date(Date.now()+3*86400000));
  let notifs = endingSoon.map(l => `Leave ending soon: ${l.teacher}`).slice(0,5);
  document.getElementById('notificationCount').textContent = notifs.length;
  notifList.innerHTML = notifs.length ? notifs.map(n => `<div class="notif-item">🔔 ${n}</div>`).join('') : '<p class="notif-empty">No notifications</p>';
}

// Check session on load
window.addEventListener('load', () => {
  const saved = sessionStorage.getItem('currentUser');
  if (saved) {
    currentUser = JSON.parse(saved);
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    setupDashboard();
  }
});