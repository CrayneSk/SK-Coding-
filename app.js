// ==================== CHEZIYA HIGH SCHOOL EMPLOYEE SYSTEM ====================
// Firebase Integration Placeholders:
// 1. Replace localStorage calls with Firestore get/set
// 2. Use firebase.auth() for authentication instead of localStorage
// 3. Uncomment Firebase SDK scripts in index.html

// ==================== SEED DATA ====================
function seedData() {
    // Users
    if (!localStorage.getItem('cheziya_users')) {
        const users = [
            {
                id: 'u1',
                username: 'admin',
                password: 'admin123',
                role: 'admin',
                name: 'Admin User',
                email: 'admin@cheziya.ac.zw'
            },
            {
                id: 'u2',
                username: 'principal',
                password: 'principal123',
                role: 'principal',
                name: 'Dr. Moyo',
                email: 'principal@cheziya.ac.zw'
            },
            {
                id: 'u3',
                username: 'teacher',
                password: 'teacher123',
                role: 'teacher',
                name: 'Mrs. Ndlovu',
                email: 'ndlovu@cheziya.ac.zw'
            }
        ];
        localStorage.setItem('cheziya_users', JSON.stringify(users));
    }

    // Employees (start with empty - admin creates them)
    if (!localStorage.getItem('cheziya_employees')) {
        const sampleEmployee = {
            id: 'emp_sample',
            name: 'Mrs. Ndlovu',
            empId: 'T001',
            natId: '63-1234567X45',
            gender: 'Female',
            phone: '+263 77 123 4567',
            email: 'ndlovu@cheziya.ac.zw',
            address: '12 Main St, Gweru',
            profilePic: '',
            department: '',
            position: 'Teacher',
            employmentDate: '2020-01-15',
            status: 'Active',
            emergencyContact: '+263 77 987 6543',
            educationLevel: "Bachelor's Degree",
            highestQualification: 'BSc Education',
            university: 'University of Zimbabwe',
            graduationYear: '2019',
            certificates: 'TEFL, Classroom Management',
            subjects: [],
            extraRoles: ['Class Teacher'],
            hod: ''
        };
        localStorage.setItem('cheziya_employees', JSON.stringify([sampleEmployee]));
    }

    // Departments (empty - admin creates all)
    if (!localStorage.getItem('cheziya_departments')) {
        localStorage.setItem('cheziya_departments', JSON.stringify([]));
    }

    // Leave
    if (!localStorage.getItem('cheziya_leave')) {
        localStorage.setItem('cheziya_leave', JSON.stringify([]));
    }

    // Attendance
    if (!localStorage.getItem('cheziya_attendance')) {
        localStorage.setItem('cheziya_attendance', JSON.stringify([]));
    }

    // Announcements
    if (!localStorage.getItem('cheziya_announcements')) {
        localStorage.setItem('cheziya_announcements', JSON.stringify([]));
    }
}

seedData();

// ==================== GLOBAL STATE ====================
let currentUser = null;
let currentPage = 'dashboard';

// ==================== HELPER FUNCTIONS ====================
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

// Modal close events
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

// ==================== LOGIN SYSTEM ====================
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const role = document.getElementById('loginRole').value;
    const users = JSON.parse(localStorage.getItem('cheziya_users') || '[]');
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

// Password visibility toggle
document.getElementById('toggleLoginPassword').addEventListener('click', function() {
    const pw = document.getElementById('loginPassword');
    pw.type = pw.type === 'password' ? 'text' : 'password';
    this.textContent = pw.type === 'password' ? '👁️' : '🙈';
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', function() {
    currentUser = null;
    sessionStorage.removeItem('currentUser');
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').textContent = '';
    showToast('Logged out successfully.');
});

// ==================== DASHBOARD SETUP & NAVIGATION ====================
function setupDashboard() {
    updateUIForRole();
    renderPage('dashboard');
    updateNotifications();

    // Navigation event listeners
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            if (!page) return;

            // Role-based access control
            if (currentUser.role === 'teacher' && ['employees', 'departments', 'reports'].includes(
                    page)) {
                showToast('Access denied. Insufficient permissions.', 'error');
                return;
            }
            if (currentUser.role === 'principal' && ['employees', 'departments'].includes(page)) {
                showToast('Access denied. Insufficient permissions.', 'error');
                return;
            }

            setActiveNav(page);
            renderPage(page);
        });
    });

    // Mobile sidebar toggle
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
}

function updateUIForRole() {
    document.getElementById('userNameDisplay').textContent = currentUser.name;
    document.getElementById('userRoleBadge').textContent = currentUser.role.toUpperCase();
    document.getElementById('userAvatar').textContent = currentUser.role === 'admin' ? '👑' : currentUser
        .role === 'principal' ? '🎓' : '👩‍🏫';

    // Hide restricted nav items
    const teacherHidden = ['navEmployees', 'navDepartments', 'navReports'];
    teacherHidden.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = (currentUser.role === 'teacher' || currentUser.role === 'principal') ?
                'none' : 'flex';
        }
    });

    // Principal can see reports
    if (currentUser.role === 'principal') {
        const reportsNav = document.getElementById('navReports');
        if (reportsNav) reportsNav.style.display = 'flex';
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

// ==================== PAGE RENDERING ====================
function renderPage(page) {
    currentPage = page;
    const content = document.getElementById('contentArea');

    switch (page) {
        case 'dashboard':
            content.innerHTML = renderDashboard();
            break;
        case 'employees':
            content.innerHTML = renderEmployees();
            break;
        case 'departments':
            content.innerHTML = renderDepartments();
            break;
        case 'leave':
            content.innerHTML = renderLeave();
            break;
        case 'attendance':
            content.innerHTML = renderAttendance();
            break;
        case 'announcements':
            content.innerHTML = renderAnnouncements();
            break;
        case 'reports':
            content.innerHTML = renderReports();
            break;
        case 'profile':
            content.innerHTML = renderProfile();
            break;
        default:
            content.innerHTML = '<p>Page not found.</p>';
    }
}

// ==================== DASHBOARD PAGE ====================
function renderDashboard() {
    const employees = JSON.parse(localStorage.getItem('cheziya_employees') || '[]');
    const departments = JSON.parse(localStorage.getItem('cheziya_departments') || '[]');
    const leaves = JSON.parse(localStorage.getItem('cheziya_leave') || '[]');
    const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
    const approvedLeaves = leaves.filter(l => l.status === 'approved').length;
    const announcements = JSON.parse(localStorage.getItem('cheziya_announcements') || '[]');

    return `
        <div class="card" style="animation: fadeInUp 0.5s ease;">
            <h2 style="color: var(--sky-800);">Welcome back, ${currentUser.name}! 👋</h2>
            <p style="color: var(--text-muted);">Role: ${currentUser.role.toUpperCase()}</p>
            <p style="color: var(--text-muted);">Today is ${new Date().toLocaleDateString('en-ZW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
            <div class="card" style="text-align: center; animation: fadeInUp 0.5s ease;">
                <div style="font-size: 2.5rem; color: var(--primary);">👥</div>
                <h2 style="color: var(--sky-800);">${employees.length}</h2>
                <p style="color: var(--text-muted);">Total Employees</p>
            </div>
            <div class="card" style="text-align: center; animation: fadeInUp 0.6s ease;">
                <div style="font-size: 2.5rem; color: var(--primary);">🏛️</div>
                <h2 style="color: var(--sky-800);">${departments.length}</h2>
                <p style="color: var(--text-muted);">Departments</p>
            </div>
            <div class="card" style="text-align: center; animation: fadeInUp 0.7s ease;">
                <div style="font-size: 2.5rem; color: var(--warning);">📝</div>
                <h2 style="color: var(--sky-800);">${pendingLeaves}</h2>
                <p style="color: var(--text-muted);">Pending Leaves</p>
            </div>
            <div class="card" style="text-align: center; animation: fadeInUp 0.8s ease;">
                <div style="font-size: 2.5rem; color: var(--success);">✅</div>
                <h2 style="color: var(--sky-800);">${approvedLeaves}</h2>
                <p style="color: var(--text-muted);">Approved Leaves</p>
            </div>
            <div class="card" style="text-align: center; animation: fadeInUp 0.9s ease;">
                <div style="font-size: 2.5rem; color: var(--primary);">📢</div>
                <h2 style="color: var(--sky-800);">${announcements.length}</h2>
                <p style="color: var(--text-muted);">Announcements</p>
            </div>
        </div>
    `;
}

// ==================== EMPLOYEES PAGE ====================
function renderEmployees() {
    if (currentUser.role === 'teacher') return '<p>Access denied.</p>';

    const employees = JSON.parse(localStorage.getItem('cheziya_employees') || '[]');
    let rows = employees.map((emp, index) => `
        <tr style="animation: slideInLeft ${0.3 + index * 0.05}s ease;">
            <td><strong>${emp.name}</strong></td>
            <td>${emp.empId || '-'}</td>
            <td>${emp.position || 'Teacher'}</td>
            <td>${emp.department || 'Unassigned'}</td>
            <td>${emp.educationLevel || '-'}</td>
            <td><span class="badge-status status-active">${emp.status || 'Active'}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewEmployee('${emp.id}')" title="View Details">👁️ View</button>
                <button class="btn btn-sm btn-outline" onclick="editEmployee('${emp.id}')" title="Edit">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteEmployee('${emp.id}')" title="Delete">🗑️</button>
            </td>
        </tr>
    `).join('');

    return `
        <div class="card">
            <div class="card-header">
                <h3>👥 Employee Management</h3>
                <button class="btn btn-primary" onclick="openAddEmployeeModal()">+ Add New Employee</button>
            </div>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Employee ID</th>
                            <th>Position</th>
                            <th>Department</th>
                            <th>Education Level</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>${rows || '<tr><td colspan="7" style="text-align:center;">No employees found. Click "Add New Employee" to create one.</td></tr>'}</tbody>
                </table>
            </div>
        </div>
    `;
}

// Add Employee Modal - COMPREHENSIVE with all fields
function openAddEmployeeModal() {
    const departments = JSON.parse(localStorage.getItem('cheziya_departments') || '[]');
    const deptOptions = departments.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
    const allEmployees = JSON.parse(localStorage.getItem('cheziya_employees') || '[]');
    const hodOptions = allEmployees.filter(e => e.position === 'Teacher').map(e =>
        `<option value="${e.id}">${e.name} (${e.empId || 'No ID'})</option>`
    ).join('');

    openModal('Add New Employee', `
        <form id="addEmpForm" class="form-grid">
            <div class="form-group" style="grid-column: span 2;">
                <h4 style="color: var(--sky-700); border-bottom: 2px solid var(--sky-100); padding-bottom: 0.5rem;">📋 Personal Information</h4>
            </div>
            <div class="form-group">
                <label>Full Name *</label>
                <input name="name" placeholder="e.g. John Doe" required>
            </div>
            <div class="form-group">
                <label>Employee ID *</label>
                <input name="empId" placeholder="e.g. T001" required>
            </div>
            <div class="form-group">
                <label>National ID</label>
                <input name="natId" placeholder="e.g. 63-1234567X45">
            </div>
            <div class="form-group">
                <label>Gender</label>
                <select name="gender">
                    <option value="">Select Gender</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                </select>
            </div>
            <div class="form-group">
                <label>Phone Number</label>
                <input name="phone" placeholder="+263 77 123 4567">
            </div>
            <div class="form-group">
                <label>Email Address</label>
                <input name="email" type="email" placeholder="employee@cheziya.ac.zw">
            </div>
            <div class="form-group" style="grid-column: span 2;">
                <label>Address</label>
                <input name="address" placeholder="123 Main Street, Gweru">
            </div>
            <div class="form-group">
                <label>Profile Picture URL</label>
                <input name="profilePic" placeholder="https://example.com/photo.jpg">
            </div>
            <div class="form-group">
                <label>Emergency Contact</label>
                <input name="emergencyContact" placeholder="+263 77 987 6543">
            </div>

            <div class="form-group" style="grid-column: span 2; margin-top: 1rem;">
                <h4 style="color: var(--sky-700); border-bottom: 2px solid var(--sky-100); padding-bottom: 0.5rem;">🎓 Education Information</h4>
            </div>
            <div class="form-group">
                <label>Education Level *</label>
                <select name="educationLevel" required>
                    <option value="">Select Education Level</option>
                    <option>Certificate</option>
                    <option>Diploma</option>
                    <option>Bachelor's Degree</option>
                    <option>Master's Degree</option>
                    <option>Doctorate (PhD)</option>
                    <option>Post-Doctorate</option>
                </select>
            </div>
            <div class="form-group">
                <label>Highest Qualification</label>
                <input name="highestQualification" placeholder="e.g. BSc Education">
            </div>
            <div class="form-group">
                <label>University/College</label>
                <input name="university" placeholder="e.g. University of Zimbabwe">
            </div>
            <div class="form-group">
                <label>Graduation Year</label>
                <input type="number" name="graduationYear" min="1950" max="2030" placeholder="e.g. 2019">
            </div>
            <div class="form-group" style="grid-column: span 2;">
                <label>Certificates (comma separated)</label>
                <input name="certificates" placeholder="e.g. TEFL, Classroom Management, First Aid">
            </div>

            <div class="form-group" style="grid-column: span 2; margin-top: 1rem;">
                <h4 style="color: var(--sky-700); border-bottom: 2px solid var(--sky-100); padding-bottom: 0.5rem;">💼 Employment Details</h4>
            </div>
            <div class="form-group">
                <label>Department</label>
                <select name="department">
                    <option value="">No Department</option>
                    ${deptOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Position</label>
                <input name="position" value="Teacher" placeholder="e.g. Senior Teacher">
            </div>
            <div class="form-group">
                <label>Employment Date (Year Joined) *</label>
                <input type="date" name="employmentDate" required>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select name="status">
                    <option>Active</option>
                    <option>On Leave</option>
                    <option>Inactive</option>
                    <option>Probation</option>
                </select>
            </div>
            <div class="form-group" style="grid-column: span 2;">
                <label>Subjects Taught (comma separated)</label>
                <input name="subjects" placeholder="e.g. Biology, Chemistry, Physics">
            </div>
            <div class="form-group">
                <label>Assigned HOD (Head of Department)</label>
                <select name="hod">
                    <option value="">No HOD Assigned</option>
                    ${hodOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Extra Roles (hold Ctrl/Cmd to select multiple)</label>
                <select name="extraRoles" multiple style="height: 120px;">
                    <option value="Sports Master">Sports Master</option>
                    <option value="Class Teacher">Class Teacher</option>
                    <option value="Guidance Counselor">Guidance Counselor</option>
                    <option value="Examination Officer">Examination Officer</option>
                    <option value="Discipline Master">Discipline Master</option>
                    <option value="Club Patron">Club Patron</option>
                    <option value="Librarian">Librarian</option>
                    <option value="Lab Technician">Lab Technician</option>
                </select>
                <small style="color: var(--text-muted);">Hold Ctrl (Windows) or Cmd (Mac) to select multiple roles</small>
            </div>
            <button type="submit" class="btn btn-success btn-block" style="grid-column: span 2; margin-top: 1rem;">💾 Save Employee</button>
        </form>
    `);

    document.getElementById('addEmpForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const emp = {};

        // Process form data
        for (let [key, value] of formData.entries()) {
            if (key === 'extraRoles') {
                emp.extraRoles = formData.getAll('extraRoles');
            } else if (key === 'subjects') {
                emp.subjects = value ? value.split(',').map(s => s.trim()).filter(s => s) : [];
            } else {
                emp[key] = value;
            }
        }

        emp.id = 'emp_' + Date.now();
        emp.role = 'teacher';

        let employees = JSON.parse(localStorage.getItem('cheziya_employees') || '[]');
        employees.push(emp);
        localStorage.setItem('cheziya_employees', JSON.stringify(employees));

        closeModal();
        renderPage('employees');
        showToast('Employee added successfully! 🎉', 'success');
        updateNotifications();
    });
}

// View Employee - FULL DETAILS
function viewEmployee(id) {
    const employees = JSON.parse(localStorage.getItem('cheziya_employees') || '[]');
    const emp = employees.find(e => e.id === id);
    if (!emp) {
        showToast('Employee not found.', 'error');
        return;
    }

    const hodEmployee = emp.hod ? employees.find(e => e.id === emp.hod) : null;

    openModal(`Employee Profile: ${emp.name}`, `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.9rem;">
            <div style="grid-column: span 2; background: var(--sky-50); padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem;">
                <h4 style="color: var(--sky-700); margin-bottom: 0.5rem;">📋 Personal Information</h4>
                <p><strong>Full Name:</strong> ${emp.name}</p>
                <p><strong>Employee ID:</strong> ${emp.empId || 'Not assigned'}</p>
                <p><strong>National ID:</strong> ${emp.natId || 'Not provided'}</p>
                <p><strong>Gender:</strong> ${emp.gender || 'Not specified'}</p>
                <p><strong>Phone:</strong> ${emp.phone || 'Not provided'}</p>
                <p><strong>Email:</strong> ${emp.email || 'Not provided'}</p>
                <p><strong>Address:</strong> ${emp.address || 'Not provided'}</p>
                <p><strong>Emergency Contact:</strong> ${emp.emergencyContact || 'Not provided'}</p>
            </div>

            <div style="grid-column: span 2; background: var(--sky-50); padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem;">
                <h4 style="color: var(--sky-700); margin-bottom: 0.5rem;">🎓 Education Details</h4>
                <p><strong>Education Level:</strong> ${emp.educationLevel || 'Not specified'}</p>
                <p><strong>Highest Qualification:</strong> ${emp.highestQualification || 'Not specified'}</p>
                <p><strong>University/College:</strong> ${emp.university || 'Not specified'}</p>
                <p><strong>Graduation Year:</strong> ${emp.graduationYear || 'Not specified'}</p>
                <p><strong>Certificates:</strong> ${emp.certificates || 'None listed'}</p>
            </div>

            <div style="grid-column: span 2; background: var(--sky-50); padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem;">
                <h4 style="color: var(--sky-700); margin-bottom: 0.5rem;">💼 Employment Information</h4>
                <p><strong>Department:</strong> ${emp.department || 'Unassigned'}</p>
                <p><strong>Position:</strong> ${emp.position || 'Not specified'}</p>
                <p><strong>Employment Date:</strong> ${emp.employmentDate || 'Not specified'}</p>
                <p><strong>Status:</strong> <span class="badge-status status-active">${emp.status || 'Active'}</span></p>
                <p><strong>Subjects Taught:</strong> ${emp.subjects && emp.subjects.length ? emp.subjects.join(', ') : 'None assigned'}</p>
                <p><strong>Extra Roles:</strong> ${emp.extraRoles && emp.extraRoles.length ? emp.extraRoles.join(', ') : 'None'}</p>
                <p><strong>HOD:</strong> ${hodEmployee ? hodEmployee.name : (emp.hod ? emp.hod : 'No HOD assigned')}</p>
            </div>
        </div>
        <button class="btn btn-primary btn-block" onclick="closeModal()" style="margin-top: 1rem;">Close</button>
    `);
}

// Edit Employee
function editEmployee(id) {
    const employees = JSON.parse(localStorage.getItem('cheziya_employees') || '[]');
    const emp = employees.find(e => e.id === id);
    if (!emp) return;

    const departments = JSON.parse(localStorage.getItem('cheziya_departments') || '[]');
    const deptOptions = departments.map(d =>
        `<option value="${d.name}" ${emp.department === d.name ? 'selected' : ''}>${d.name}</option>`
    ).join('');

    openModal('Edit Employee', `
        <form id="editEmpForm" class="form-grid">
            <div class="form-group"><label>Name *</label><input name="name" value="${emp.name}" required></div>
            <div class="form-group"><label>Employee ID *</label><input name="empId" value="${emp.empId || ''}" required></div>
            <div class="form-group"><label>Department</label><select name="department"><option value="">None</option>${deptOptions}</select></div>
            <div class="form-group"><label>Position</label><input name="position" value="${emp.position || 'Teacher'}"></div>
            <div class="form-group"><label>Status</label><select name="status"><option ${emp.status === 'Active' ? 'selected' : ''}>Active</option><option ${emp.status === 'On Leave' ? 'selected' : ''}>On Leave</option><option ${emp.status === 'Inactive' ? 'selected' : ''}>Inactive</option></select></div>
            <button type="submit" class="btn btn-primary btn-block" style="grid-column: span 2;">Update</button>
        </form>
    `);

    document.getElementById('editEmpForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        Object.assign(emp, Object.fromEntries(fd.entries()));
        localStorage.setItem('cheziya_employees', JSON.stringify(employees));
        closeModal();
        renderPage('employees');
        showToast('Employee updated!', 'success');
    });
}

// Delete Employee
function deleteEmployee(id) {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    let employees = JSON.parse(localStorage.getItem('cheziya_employees') || '[]');
    employees = employees.filter(e => e.id !== id);
    localStorage.setItem('cheziya_employees', JSON.stringify(employees));
    renderPage('employees');
    showToast('Employee deleted.', 'success');
}

// ==================== DEPARTMENTS PAGE (FULLY CUSTOMIZABLE) ====================
function renderDepartments() {
    const departments = JSON.parse(localStorage.getItem('cheziya_departments') || '[]');
    const employees = JSON.parse(localStorage.getItem('cheziya_employees') || '[]');

    let html = departments.map((dept, index) => {
        const hodEmployee = dept.hod ? employees.find(e => e.id === dept.hod) : null;
        const deptTeachers = employees.filter(e => e.department === dept.name);

        return `
            <div class="card" style="animation: fadeInUp ${0.3 + index * 0.1}s ease;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h4 style="color: var(--sky-800);">🏛️ ${dept.name}</h4>
                        <p><strong>Subjects:</strong> ${dept.subjects && dept.subjects.length ? dept.subjects.join(', ') : '<span style="color: var(--text-muted);">No subjects added</span>'}</p>
                        <p><strong>HOD:</strong> ${hodEmployee ? hodEmployee.name : '<span style="color: var(--text-muted);">Not assigned</span>'}</p>
                        <p><strong>Teachers:</strong> ${deptTeachers.length} assigned</p>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline" onclick="editDepartment('${dept.id}')">✏️ Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteDepartment('${dept.id}')">🗑️ Delete</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div>
            <div style="margin-bottom: 1rem;">
                <button class="btn btn-primary" onclick="openAddDepartmentModal()">+ Create New Department</button>
            </div>
            <div>
                ${html || '<div class="card"><p style="text-align: center; color: var(--text-muted);">No departments created yet. Click "Create New Department" to get started.</p></div>'}
            </div>
        </div>
    `;
}

// Add Department Modal
function openAddDepartmentModal() {
    openModal('Create New Department', `
        <form id="deptForm">
            <div class="form-group">
                <label>Department Name *</label>
                <input name="name" placeholder="e.g. Sciences" required>
            </div>
            <div class="form-group">
                <label>Subjects (comma separated)</label>
                <input name="subjects" placeholder="e.g. Mathematics, Biology, Chemistry, Physics">
                <small style="color: var(--text-muted);">Enter subjects separated by commas</small>
            </div>
            <button type="submit" class="btn btn-success">Create Department</button>
        </form>
    `);

    document.getElementById('deptForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        const dept = {
            id: 'dept_' + Date.now(),
            name: fd.get('name'),
            subjects: fd.get('subjects') ? fd.get('subjects').split(',').map(s => s.trim()).filter(
                s => s) : [],
            hod: null
        };

        let departments = JSON.parse(localStorage.getItem('cheziya_departments') || '[]');

        // Check for duplicate name
        if (departments.some(d => d.name.toLowerCase() === dept.name.toLowerCase())) {
            showToast('Department with this name already exists!', 'error');
            return;
        }

        departments.push(dept);
        localStorage.setItem('cheziya_departments', JSON.stringify(departments));
        closeModal();
        renderPage('departments');
        showToast('Department created successfully! 🎉', 'success');
    });
}

// Edit Department Modal
function editDepartment(id) {
    const departments = JSON.parse(localStorage.getItem('cheziya_departments') || '[]');
    const dept = departments.find(d => d.id === id);
    if (!dept) return;

    const employees = JSON.parse(localStorage.getItem('cheziya_employees') || '[]');
    const hodOptions = employees.map(e =>
        `<option value="${e.id}" ${dept.hod === e.id ? 'selected' : ''}>${e.name} (${e.empId || 'No ID'})</option>`
    ).join('');

    openModal(`Edit Department: ${dept.name}`, `
        <form id="editDeptForm">
            <div class="form-group">
                <label>Department Name</label>
                <input name="name" value="${dept.name}" required>
            </div>
            <div class="form-group">
                <label>Subjects (comma separated)</label>
                <input name="subjects" value="${dept.subjects.join(', ')}">
            </div>
            <div class="form-group">
                <label>Assign Head of Department (HOD)</label>
                <select name="hod">
                    <option value="">No HOD</option>
                    ${hodOptions}
                </select>
            </div>
            <button type="submit" class="btn btn-primary">Update Department</button>
        </form>
    `);

    document.getElementById('editDeptForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const fd = new FormData(e.target);

        dept.name = fd.get('name');
        dept.subjects = fd.get('subjects') ? fd.get('subjects').split(',').map(s => s.trim()).filter(
            s => s) : [];
        dept.hod = fd.get('hod') || null;

        localStorage.setItem('cheziya_departments', JSON.stringify(departments));
        closeModal();
        renderPage('departments');
        showToast('Department updated!', 'success');
    });
}

// Delete Department
function deleteDepartment(id) {
    if (!confirm('Delete this department? This cannot be undone.')) return;
    let departments = JSON.parse(localStorage.getItem('cheziya_departments') || '[]');
    departments = departments.filter(d => d.id !== id);
    localStorage.setItem('cheziya_departments', JSON.stringify(departments));
    renderPage('departments');
    showToast('Department deleted.', 'success');
}

// ==================== LEAVE MANAGEMENT ====================
function renderLeave() {
    const leaves = JSON.parse(localStorage.getItem('cheziya_leave') || '[]');
    const isAdminOrPrincipal = currentUser.role === 'admin' || currentUser.role === 'principal';

    let rows = leaves.map(l => `
        <tr>
            <td>${l.teacher}</td>
            <td>${l.type}</td>
            <td>${l.start} to ${l.end}</td>
            <td><span class="badge-status status-${l.status}">${l.status.toUpperCase()}</span></td>
            <td>
                ${isAdminOrPrincipal && l.status === 'pending' ? `
                    <button class="btn btn-sm btn-success" onclick="updateLeave('${l.id}', 'approved')">✅ Approve</button>
                    <button class="btn btn-sm btn-danger" onclick="updateLeave('${l.id}', 'rejected')">❌ Reject</button>
                ` : '-'}
            </td>
        </tr>
    `).join('');

    return `
        <div class="card">
            <div class="card-header">
                <h3>📝 Leave Management</h3>
                <button class="btn btn-primary" onclick="applyLeaveModal()">+ Apply for Leave</button>
            </div>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Teacher</th>
                            <th>Type</th>
                            <th>Dates</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>${rows || '<tr><td colspan="5" style="text-align:center;">No leave applications yet.</td></tr>'}</tbody>
                </table>
            </div>
        </div>
    `;
}

function applyLeaveModal() {
    openModal('Apply for Leave', `
        <form id="leaveForm">
            <div class="form-group">
                <label>Leave Type</label>
                <select name="type" required>
                    <option value="">Select type</option>
                    <option>Sick Leave</option>
                    <option>Vacation</option>
                    <option>Maternity/Paternity</option>
                    <option>Study Leave</option>
                    <option>Personal Leave</option>
                    <option>Other</option>
                </select>
            </div>
            <div class="form-group">
                <label>Start Date *</label>
                <input type="date" name="start" required>
            </div>
            <div class="form-group">
                <label>End Date *</label>
                <input type="date" name="end" required>
            </div>
            <button type="submit" class="btn btn-primary">Submit Application</button>
        </form>
    `);

    document.getElementById('leaveForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        const start = new Date(fd.get('start'));
        const end = new Date(fd.get('end'));

        if (end < start) {
            showToast('End date must be after start date!', 'error');
            return;
        }

        const leave = {
            id: 'l_' + Date.now(),
            teacher: currentUser.name,
            teacherId: currentUser.id,
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
        showToast('Leave application submitted! ✅', 'success');
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
        showToast(`Leave ${status}!`, 'success');
        updateNotifications();
    }
}

// ==================== ATTENDANCE SYSTEM ====================
function renderAttendance() {
    const attendance = JSON.parse(localStorage.getItem('cheziya_attendance') || '[]');
    const today = new Date().toISOString().slice(0, 10);
    const todayRecord = attendance.find(a => a.user === currentUser.name && a.date === today);

    let statusHTML = '';
    if (todayRecord) {
        statusHTML = todayRecord.clockOut ?
            `<p style="color: var(--success);">✅ You've completed your day. Clock In: ${todayRecord.clockIn} | Clock Out: ${todayRecord.clockOut}</p>` :
            `<p style="color: var(--primary);">🕐 You're clocked in since ${todayRecord.clockIn}. Don't forget to clock out!</p>`;
    } else {
        statusHTML = '<p style="color: var(--text-muted);">❌ Not clocked in today.</p>';
    }

    return `
        <div class="card" style="text-align: center;">
            <h3 style="color: var(--sky-800);">⏰ Attendance</h3>
            <div style="font-size: 4rem; margin: 1rem 0;">${todayRecord ? '✅' : '⏰'}</div>
            ${statusHTML}
            <button class="btn btn-success btn-lg" onclick="clockInOut()" style="margin-top: 1rem;">
                ${todayRecord && !todayRecord.clockOut ? '🏠 Clock Out' : '🏢 Clock In'}
            </button>
            <p style="margin-top: 1rem; color: var(--text-muted); font-size: 0.9rem;">
                Date: ${new Date().toLocaleDateString('en-ZW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
        </div>
    `;
}

function clockInOut() {
    let attendance = JSON.parse(localStorage.getItem('cheziya_attendance') || '[]');
    const today = new Date().toISOString().slice(0, 10);
    const existing = attendance.find(a => a.user === currentUser.name && a.date === today);

    if (!existing) {
        attendance.push({
            user: currentUser.name,
            userId: currentUser.id,
            date: today,
            clockIn: new Date().toLocaleTimeString(),
            clockOut: null
        });
        showToast('Clocked in! Have a great day! 🌟', 'success');
    } else if (!existing.clockOut) {
        existing.clockOut = new Date().toLocaleTimeString();
        showToast('Clocked out! See you tomorrow! 👋', 'success');
    } else {
        showToast('You have already completed your attendance for today.', 'info');
        return;
    }

    localStorage.setItem('cheziya_attendance', JSON.stringify(attendance));
    renderPage('attendance');
}

// ==================== ANNOUNCEMENTS (BROADCAST TO ALL TEACHERS) ====================
function renderAnnouncements() {
    const announcements = JSON.parse(localStorage.getItem('cheziya_announcements') || '[]');
    const isAdminOrPrincipal = currentUser.role === 'admin' || currentUser.role === 'principal';

    let html = announcements.slice().reverse().map((ann, index) => `
        <div class="card" style="animation: fadeInUp ${0.3 + index * 0.1}s ease;">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h4 style="color: var(--sky-800);">📢 ${ann.title}</h4>
                    <p style="color: var(--text-dark); margin: 0.5rem 0;">${ann.content}</p>
                    <small style="color: var(--text-muted);">
                        Posted by <strong>${ann.author}</strong> on ${ann.date} | 
                        <span style="color: var(--primary);">📨 Sent to all teachers</span>
                    </small>
                </div>
                ${isAdminOrPrincipal ? `
                    <div>
                        <button class="btn btn-sm btn-outline" onclick="editAnnouncement('${ann.id}')">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteAnnouncement('${ann.id}')">🗑️</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');

    if (isAdminOrPrincipal) {
        html += `<button class="btn btn-primary" onclick="openAnnouncementModal()">+ New Announcement</button>`;
    }

    return html || '<div class="card"><p style="text-align: center; color: var(--text-muted);">No announcements yet.</p></div>';
}

function openAnnouncementModal() {
    openModal('Create Announcement (Broadcast to all Teachers)', `
        <form id="annForm">
            <div class="form-group">
                <label>Title *</label>
                <input name="title" placeholder="e.g. Staff Meeting Reminder" required>
            </div>
            <div class="form-group">
                <label>Content *</label>
                <textarea name="content" rows="4" placeholder="Write your announcement here..." required></textarea>
            </div>
            <small style="color: var(--primary); display: block; margin-bottom: 1rem;">
                📨 This announcement will be visible to ALL teachers and staff members.
            </small>
            <button type="submit" class="btn btn-primary">📢 Broadcast Announcement</button>
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
            authorRole: currentUser.role,
            date: new Date().toISOString().slice(0, 10),
            broadcastTo: 'all_teachers'
        };

        let announcements = JSON.parse(localStorage.getItem('cheziya_announcements') || '[]');
        announcements.push(ann);
        localStorage.setItem('cheziya_announcements', JSON.stringify(announcements));
        closeModal();
        renderPage('announcements');
        showToast('Announcement broadcasted to all teachers! 📢', 'success');
        updateNotifications();
    });
}

function editAnnouncement(id) {
    const announcements = JSON.parse(localStorage.getItem('cheziya_announcements') || '[]');
    const ann = announcements.find(a => a.id === id);
    if (!ann) return;

    openModal('Edit Announcement', `
        <form id="editAnnForm">
            <div class="form-group">
                <label>Title</label>
                <input name="title" value="${ann.title}" required>
            </div>
            <div class="form-group">
                <label>Content</label>
                <textarea name="content" rows="4" required>${ann.content}</textarea>
            </div>
            <button type="submit" class="btn btn-primary">