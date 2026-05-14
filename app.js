// ==================== CHEZIYA HIGH SCHOOL EMPLOYEE SYSTEM ====================
// Firebase integration: replace localStorage calls with Firestore methods.

// ---------- Seed Demo Data ----------
function seedData() {
  if (!localStorage.getItem('cheziya_users')) {
    const users = [
      { id: 'u1', username: 'admin', password: 'admin123', role: 'admin', name: 'Admin User', email: 'admin@cheziya.ac.zw' },
      { id: 'u2', username: 'principal', password: 'principal123', role: 'principal', name: 'Dr. Moyo', email: 'principal@cheziya.ac.zw' },
      { id: 'u3', username: 'teacher', password: 'teacher123', role: 'teacher', name: 'Mrs. Ndlovu', email: 'ndlovu@cheziya.ac.zw',
        department: null, subjects: [], hod: null, extraRoles: ['Class Teacher'] }
    ];
    localStorage.setItem('cheziya_users', JSON.stringify(users));
    // Employees array (separate profiles)
    const employees = [
      {
        id: 'emp1', name: 'Mrs. Ndlovu', empId: 'T001', natId: '63-1234567X45', gender: 'Female',
        phone: '+263 77 123 4567', email: 'ndlovu@cheziya.ac.zw', address: '12 Main St, Gweru',
        profilePic: '', department: null, position: 'Teacher', employmentDate: '2020-01-15',
        status: 'Active', emergencyContact: '+263 77 987 6543',
        highestQualification: 'BSc Education', university: 'University of Zimbabwe',
        graduationYear: 2019, certificates: 'TEFL, Classroom Management',
        subjects: [], extraRoles: ['Class Teacher'], hod: null
      }
    ];
    localStorage.setItem('cheziya_employees', JSON.stringify(employees));
    // Departments (empty initially, admin creates)
    localStorage.setItem('cheziya_departments', JSON.stringify([]));
    localStorage.setItem('cheziya_leave', JSON.stringify([]));
    localStorage.setItem('cheziya_attendance', JSON.stringify([]));
    localStorage.setItem('cheziya_announcements', JSON.stringify([]));
  }
}
seedData();

// ---------- Global State ----------
let currentUser = null;
let currentPage = 'dashboard';

// ---------- Helpers ----------
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

// ---------- Login ----------
document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const role = document.getElementById('loginRole').value;
  const users = JSON.parse(localStorage.getItem('cheziya_users'));
  const user = users.find(u => u.username === username && u.password === password && u.role === role);
  if (user) {
    currentUser = user;
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    setupDashboard();
    showToast(`Welcome, ${user.name}!`, 'success');
  } else {
    document.getElementById('loginError').textContent = 'Invalid credentials or role.';
  }
});
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
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const page = this.dataset.page;
      if (!page) return;
      if (currentUser.role === 'teacher' && ['employees','departments','reports'].includes(page)) {
        showToast('Access denied.', 'error'); return;
      }
      if (currentUser.role === 'principal' && ['employees','departments'].includes(page)) {
        showToast('Access denied.', 'error'); return;
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
  // Hide Employees/Departments for teachers & principal
  const teacherHidden = ['navEmployees','navDepartments','navReports'];
  teacherHidden.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (currentUser.role === 'teacher' || currentUser.role === 'principal') ? 'none' : 'flex';
  });
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

// ---------- Dashboard Page (now at bottom of sidebar) ----------
function renderDashboard() {
  const employees = JSON.parse(localStorage.getItem('cheziya_employees') || '[]');
  const depts = JSON.parse(localStorage.getItem('cheziya_departments') || '[]');
  const pendingLeaves = JSON.parse(localStorage.getItem('cheziya_leave') || '[]').filter(l => l.status === 'pending').length;
  return `
    <div class="card"><h3>Welcome, ${currentUser.name}!</h3><p>Role: ${currentUser.role.toUpperCase()}</p></div>
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap:1rem;">
      <div class="card"><h2>${employees.length}</h2><p>Total Employees</p></div>
      <div class="card"><h2>${depts.length}</h2><p>Departments</p></div>
      <div class="card"><h2>${pendingLeaves}</h2><p>Pending Leaves</p></div>
    </div>
  `;
}

// ---------- Employees (full CRUD) ----------
function renderEmployees() {
  const employees = JSON.parse(localStorage.getItem('cheziya_employees') || '[]');
  let rows = employees.map(emp => `
    <tr>
      <td>${emp.name}</td><td>${emp.empId || '-'}</td><td>${emp.position || 'Teacher'}</td>
      <td>${emp.department || 'Unassigned'}</td>
      <td><span class="badge-status status-active">${emp.status || 'Active'}</span></td>
      <td><button class="btn btn-sm btn-outline" onclick="viewEmployee('${emp.id}')">View</button></td>
    </tr>`).join('');
  return `
    <div class="card">
      <div class="card-header"><h3>Employees</h3><button class="btn btn-primary" onclick="openAddEmployeeModal()">+ Add Employee</button></div>
      <div class="table-responsive">
        <table><thead><tr><th>Name</th><th>ID</th><th>Position</th><th>Department</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6">No employees found.</td></tr>'}</tbody></table>
      </div>
    </div>`;
}

// Add Employee Modal (comprehensive)
function openAddEmployeeModal() {
  const departments = JSON.parse(localStorage.getItem('cheziya_departments') || '[]');
  const deptOptions = departments.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
  const allEmployees = JSON.parse(localStorage.getItem('cheziya_employees') || '[]');
  const hodOptions = allEmployees.filter(e => e.position === 'Teacher' || e.role === 'teacher').map(e => `<option value="${e.id}">${e.name}</option>`).join('');
  openModal('Add New Employee', `
    <form id="addEmpForm" class="form-grid">
      <div class="form-group"><label>Full Name *</label><input name="name" required></div>
      <div class="form-group"><label>Employee ID *</label><input name="empId" required></div>
      <div class="form-group"><label>National ID</label><input name="natId"></div>
      <div class="form-group"><label>Gender</label><select name="gender"><option>Male</option><option>Female</option></select></div>
      <div class="form-group"><label>Phone</label><input name="phone"></div>
      <div class="form-group"><label>Email</label><input name="email" type="email"></div>
      <div class="form-group"><label>Address</label><input name="address"></div>
      <div class="form-group"><label>Profile Picture URL</label><input name="profilePic" placeholder="https://..."></div>
      <div class="form-group"><label>Department</label><select name="department"><option value="">None</option>${deptOptions}</select></div>
      <div class="form-group"><label>Position</label><input name="position" value="Teacher"></div>
      <div class="form-group"><label>Employment Date</label><input type="date" name="employmentDate"></div>
      <div class="form-group"><label>Status</label><select name="status"><option>Active</option><option>On Leave</option><option>Inactive</option></select></div>
      <div class="form-group"><label>Emergency Contact</label><input name="emergencyContact"></div>
      <div class="form-group"><label>Highest Qualification</label><input name="highestQualification"></div>
      <div class="form-group"><label>University/College</label><input name="university"></div>
      <div class="form-group"><label>Graduation Year</label><input type="number" name="graduationYear" min="1950" max="2030"></div>
      <div class="form-group"><label>Certificates</label><input name="certificates" placeholder="Comma separated"></div>
      <div class="form-group"><label>Subjects Specialized</label><input name="subjects" placeholder="Comma separated"></div>
      <div class="form-group"><label>Assigned HOD</label><select name="hod"><option value="">None</option>${hodOptions}</select></div>
      <div class="form-group"><label>Extra Roles</label>
        <select name="extraRoles" multiple style="height:auto;">
          <option value="Sports Master">Sports Master</option>
          <option value="Class Teacher">Class Teacher</option>
          <option value="Guidance Counselor">Guidance Counselor</option>
          <option value="Examination Officer">Examination Officer</option>
          <option value="Discipline Master">Discipline Master</option>
          <option value="Club Patron">Club Patron</option>
        </select>
        <small>Hold Ctrl/Cmd to select multiple</small>
      </div>
      <button type="submit" class="btn btn-success btn-block" style="grid-column: span 2;">Save Employee</button>
    </form>
  `);
  document.getElementById('addEmpForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const emp = {};
    for (let [key, value] of formData.entries()) {
      if (key === 'extraRoles') {
        emp.extraRoles = formData.getAll('extraRoles');
      } else if (key === 'subjects') {
        emp.subjects = value ? value.split(',').map(s => s.trim()) : [];
      } else {
        emp[key] = value;
      }
    }
    emp.id = 'emp_' + Date.now();
    emp.role = 'teacher'; // default role
    let employees = JSON.parse(localStorage.getItem('cheziya_employees') || '[]');
    employees.push(emp);
    localStorage.setItem('cheziya_employees', JSON.stringify(employees));
    closeModal();
    renderPage('employees');
    showToast('Employee added successfully!');
  });
}

// View Employee (detailed)
function viewEmployee(id) {
  const employees = JSON.parse(localStorage.getItem('cheziya_employees') || '[]');
  const emp = employees.find(e => e.id === id);
  if (!emp) return;
  openModal('Employee Profile', `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.9rem;">
      <p><strong>Name:</strong> ${emp.name}</p>
      <p><strong>Employee ID:</strong> ${emp.empId || '-'}</p>
      <p><strong>National ID:</strong> ${emp.natId || '-'}</p>
      <p><strong>Gender:</strong> ${emp.gender || '-'}</p>
      <p><strong>Phone:</strong> ${emp.phone || '-'}</p>
      <p><strong>Email:</strong> ${emp.email || '-'}</p>
      <p><strong>Address:</strong> ${emp.address || '-'}</p>
      <p><strong>Department:</strong> ${emp.department || 'Unassigned'}</p>
      <p><strong>Position:</strong> ${emp.position || '-'}</p>
      <p><strong>Employment Date:</strong> ${emp.employmentDate || '-'}</p>
      <p><strong>Status:</strong> ${emp.status || '-'}</p>
      <p><strong>Emergency Contact:</strong> ${emp.emergencyContact || '-'}</p>
      <p><strong>Highest Qualification:</strong> ${emp.highestQualification || '-'}</p>
      <p><strong>University:</strong> ${emp.university || '-'}</p>
      <p><strong>Graduation Year:</strong> ${emp.graduationYear || '-'}</p>
      <p><strong>Certificates:</strong> ${emp.certificates || '-'}</p>
      <p><strong>Subjects:</strong> ${emp.subjects ? emp.subjects.join(', ') : '-'}</p>
      <p><strong>Extra Roles:</strong> ${emp.extraRoles ? emp.extraRoles.join(', ') : '-'}</p>
      <p><strong>HOD:</strong> ${emp.hod ? (employees.find(e=>e.id===emp.hod)?.name || emp.hod) : 'None'}</p>
    </div>
  `);
}

// ---------- Departments (Full CRUD) ----------
function renderDepartments() {
  const departments = JSON.parse(localStorage.getItem('cheziya_departments') || '[]');
  let html = departments.map(dept => {
    const hodEmployee = dept.hod ? (JSON.parse(localStorage.getItem('cheziya_employees')||'[]').find(e=>e.id===dept.hod)) : null;
    return `
    <div class="card">
      <h4>${dept.name} <button class="btn btn-sm btn-outline" onclick="editDepartment('${dept.id}')">Edit</button></h4>
      <p><strong>Subjects:</strong> ${dept.subjects.length ? dept.subjects.join(', ') : 'None'}</p>
      <p><strong>HOD:</strong> ${hodEmployee ? hodEmployee.name : 'Not assigned'}</p>
    </div>`;
  }).join('');
  return `
    <div>
      <button class="btn btn-primary" onclick="openAddDepartmentModal()">+ Add Department</button>
      <div style="margin-top:1rem;">${html || '<p>No departments created yet.</p>'}</div>
    </div>`;
}

function openAddDepartmentModal() {
  openModal('Add Department', `
    <form id="deptForm">
      <div class="form-group"><label>Department Name</label><input name="name" required></div>
      <div class="form-group"><label>Subjects (comma separated)</label><input name="subjects" placeholder="e.g. History, Heritage Studies"></div>
      <button type="submit" class="btn btn-success">Create</button>
    </form>
  `);
  document.getElementById('deptForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const dept = {
      id: 'dept_' + Date.now(),
      name: fd.get('name'),
      subjects: fd.get('subjects') ? fd.get('subjects').split(',').map(s => s.trim()) : [],
      hod: null
    };
    let departments = JSON.parse(localStorage.getItem('cheziya_departments') || '[]');
    departments.push(dept);
    localStorage.setItem('cheziya_departments', JSON.stringify(departments));
    closeModal();
    renderPage('departments');
    showToast('Department created');
  });
}

function editDepartment(id) {
  const departments = JSON.parse(localStorage.getItem('cheziya_departments') || '[]');
  const dept = departments.find(d => d.id === id);
  if (!dept) return;
  const employees = JSON.parse(localStorage.getItem('cheziya_employees') || '[]');
  const hodOptions = employees.map(e => `<option value="${e.id}" ${dept.hod===e.id?'selected':''}>${e.name}</option>`).join('');
  openModal('Edit Department', `
    <form id="editDeptForm">
      <div class="form-group"><label>Department Name</label><input name="name" value="${dept.name}" required></div>
      <div class="form-group"><label>Subjects (comma separated)</label><input name="subjects" value="${dept.subjects.join(', ')}"></div>
      <div class="form-group"><label>Assign HOD</label><select name="hod"><option value="">None</option>${hodOptions}</select></div>
      <button type="submit" class="btn btn-primary">Update</button>
    </form>
  `);
  document.getElementById('editDeptForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    dept.name = fd.get('name');
    dept.subjects = fd.get('subjects') ? fd.get('subjects').split(',').map(s => s.trim()) : [];
    dept.hod = fd.get('hod') || null;
    localStorage.setItem('cheziya_departments', JSON.stringify(departments));
    closeModal();
    renderPage('departments');
    showToast('Department updated');
  });
}

// ---------- Leave Management ----------
function renderLeave() {
  const leaves = JSON.parse(localStorage.getItem('cheziya_leave') || '[]');
  let rows = leaves.map(l => `
    <tr>
      <td>${l.teacher}</td><td>${l.type}</td><td>${l.start} to ${l.end}</td>
      <td><span class="badge-status status-${l.status}">${l.status}</span></td>
      ${ (currentUser.role==='admin' || currentUser.role==='principal') ? `<td>
        <button class="btn btn-sm btn-success" onclick="updateLeave('${l.id}','approved')">Approve</button>
        <button class="btn btn-sm btn-danger" onclick="updateLeave('${l.id}','rejected')">Reject</button>
      </td>` : '<td>-</td>'}
    </tr>`).join('');
  return `<div class="card">
    <button class="btn btn-primary" onclick="applyLeaveModal()">+ Apply Leave</button>
    <div class="table-responsive"><table><thead><tr><th>Teacher</th><th>Type</th><th>Dates</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5">No leave requests</td></tr>'}</tbody></table></div></div>`;
}
function applyLeaveModal() {
  openModal('Apply for Leave', `
    <form id="leaveForm">
      <div class="form-group"><label>Leave Type</label><input name="type" placeholder="Sick/Vacation" required></div>
      <div class="form-group"><label>Start Date</label><input type="date" name="start" required></div>
      <div class="form-group"><label>End Date</label><input type="date" name="end" required></div>
      <button type="submit" class="btn btn-primary">Submit</button>
    </form>
  `);
  document.getElementById('leaveForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const leave = {
      id: 'l_' + Date.now(),
      teacher: currentUser.name,
      type: fd.get('type'),
      start: fd.get('start'),
      end: fd.get('end'),
      status: 'pending'
    };
    let leaves = JSON.parse(localStorage.getItem('cheziya_leave') || '[]');
    leaves.push(leave);
    localStorage.setItem('cheziya_leave', JSON.stringify(leaves));
    closeModal();
    renderPage('leave');
    showToast('Leave applied');
    updateNotifications();
  });
}
function updateLeave(id, status) {
  let leaves = JSON.parse(localStorage.getItem('cheziya_leave') || '[]');
  const idx = leaves.findIndex(l => l.id === id);
  if (idx > -1) {
    leaves[idx].status = status;
    localStorage.setItem('cheziya_leave', JSON.stringify(leaves));
    renderPage('leave');
    updateNotifications();
  }
}

// ---------- Attendance ----------
function renderAttendance() {
  return `<div class="card">
    <button class="btn btn-success" onclick="clockInOut()">🕒 Clock In / Out</button>
    <p id="clockStatus" style="margin-top:1rem;">Check your attendance today.</p>
  </div>`;
}
function clockInOut() {
  let att = JSON.parse(localStorage.getItem('cheziya_attendance') || '[]');
  const today = new Date().toISOString().slice(0,10);
  const existing = att.find(a => a.user === currentUser.name && a.date === today);
  if (!existing) {
    att.push({ user: currentUser.name, date: today, clockIn: new Date().toLocaleTimeString(), clockOut: null });
    showToast('Clocked In');
  } else if (!existing.clockOut) {
    existing.clockOut = new Date().toLocaleTimeString();
    showToast('Clocked Out');
  }
  localStorage.setItem('cheziya_attendance', JSON.stringify(att));
  renderPage('attendance');
}

// ---------- Announcements (Admin/Principal broadcast) ----------
function renderAnnouncements() {
  const anns = JSON.parse(localStorage.getItem('cheziya_announcements') || '[]');
  let html = anns.map(a => `
    <div class="card">
      <h4>${a.title} <small style="color:var(--text-muted)">by ${a.author} on ${a.date}</small></h4>
      <p>${a.content}</p>
      ${(currentUser.role==='admin'||currentUser.role==='principal') ? `
        <button class="btn btn-sm btn-outline" onclick="editAnnouncement('${a.id}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteAnnouncement('${a.id}')">Delete</button>` : ''}
    </div>`).join('');
  if (currentUser.role === 'admin' || currentUser.role === 'principal') {
    html += `<button class="btn btn-primary" onclick="openAnnouncementModal()">+ New Announcement</button>`;
  }
  return html || '<p>No announcements.</p>';
}

function openAnnouncementModal() {
  openModal('Create Announcement', `
    <form id="annForm">
      <div class="form-group"><label>Title</label><input name="title" required></div>
      <div class="form-group"><label>Content</label><textarea name="content" rows="3" required></textarea></div>
      <button type="submit" class="btn btn-primary">Post</button>
    </form>
  `);
  document.getElementById('annForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const ann = {
      id: 'ann_' + Date.now(),
      title: fd.get('title'),
      content: fd.get('content'),
      author: currentUser.name,
      date: new Date().toISOString().slice(0,10)
    };
    let anns = JSON.parse(localStorage.getItem('cheziya_announcements') || '[]');
    anns.push(ann);
    localStorage.setItem('cheziya_announcements', JSON.stringify(anns));
    closeModal();
    renderPage('announcements');
    showToast('Announcement posted to all teachers');
  });
}
function editAnnouncement(id) {
  const anns = JSON.parse(localStorage.getItem('cheziya_announcements') || '[]');
  const ann = anns.find(a => a.id === id);
  if (!ann) return;
  openModal('Edit Announcement', `
    <form id="editAnnForm">
      <div class="form-group"><label>Title</label><input name="title" value="${ann.title}" required></div>
      <div class="form-group"><label>Content</label><textarea name="content" rows="3" required>${ann.content}</textarea></div>
      <button type="submit" class="btn btn-primary">Update</button>
    </form>
  `);
  document.getElementById('editAnnForm').addEventListener('submit', function(e) {
    e.preventDefault();
    ann.title = e.target.title.value;
    ann.content = e.target.content.value;
    localStorage.setItem('cheziya_announcements', JSON.stringify(anns));
    closeModal();
    renderPage('announcements');
  });
}
function deleteAnnouncement(id) {
  let anns = JSON.parse(localStorage.getItem('cheziya_announcements') || '[]');
  anns = anns.filter(a => a.id !== id);
  localStorage.setItem('cheziya_announcements', JSON.stringify(anns));
  renderPage('announcements');
  showToast('Announcement deleted');
}

// ---------- Reports (Chart) ----------
function renderReports() {
  const depts = JSON.parse(localStorage.getItem('cheziya_departments') || '[]');
  const employees = JSON.parse(localStorage.getItem('cheziya_employees') || '[]');
  const deptCounts = depts.map(d => ({
    name: d.name,
    count: employees.filter(e => e.department === d.name).length
  }));
  let chartHTML = '<div style="display:flex; gap:12px; align-items:flex-end; height:120px; margin-top:1rem;">';
  deptCounts.forEach(d => {
    const height = Math.max(d.count * 25, 10);
    chartHTML += `<div style="width:50px; background:var(--primary); height:${height}px; border-radius:6px 6px 0 0; text-align:center; color:white; font-size:0.7rem;" title="${d.name}: ${d.count}">${d.count}</div>`;
  });
  chartHTML += '</div>';
  return `<div class="card"><h3>Teachers per Department</h3>${chartHTML || '<p>No data</p>'}</div>`;
}

// ---------- Profile Page ----------
function renderProfile() {
  return `<div class="card"><h3>My Profile</h3><p>Name: ${currentUser.name}</p><p>Email: ${currentUser.email}</p><p>Role: ${currentUser.role}</p></div>`;
}

// ---------- Notifications ----------
function updateNotifications() {
  const notifList = document.getElementById('notifList');
  const leaves = JSON.parse(localStorage.getItem('cheziya_leave') || '[]');
  const endingSoon = leaves.filter(l => l.status === 'approved' && new Date(l.end) < new Date(Date.now() + 3*86400000));
  const pending = leaves.filter(l => l.status === 'pending');
  let notifs = [];
  endingSoon.forEach(l => notifs.push(`⏳ Leave ending soon: ${l.teacher}`));
  pending.forEach(l => notifs.push(`📌 Pending leave: ${l.teacher}`));
  document.getElementById('notificationCount').textContent = notifs.length;
  notifList.innerHTML = notifs.length ? notifs.map(n => `<div class="notif-item">${n}</div>`).join('') : '<p class="notif-empty">No notifications</p>';
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