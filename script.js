// script.js – Full application logic for Seek On
// -------------------------------------------------------------
// FIREBASE CONFIG – Replace with your own project settings
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "123456789",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// -------------------------------------------------------------
// GLOBAL STATE
let currentUser = null;
let userProfile = null;
let currentRoute = 'home';

// -------------------------------------------------------------
// ROUTER
function navigate(route, data = {}) {
  currentRoute = route;
  window.location.hash = route;
  renderApp(data);
}

window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1) || 'home';
  currentRoute = hash;
  renderApp();
});

// -------------------------------------------------------------
// AUTH OBSERVER
auth.onAuthStateChanged(async (user) => {
  currentUser = user;
  if (user) {
    // Fetch user profile from Firestore
    const doc = await db.collection('users').doc(user.uid).get();
    if (doc.exists) {
      userProfile = doc.data();
    } else {
      // First login – role selection required
      userProfile = null;
      navigate('select-role');
      return;
    }
  } else {
    userProfile = null;
  }
  // Re-render current route
  renderApp();
});

// -------------------------------------------------------------
// MAIN RENDER
function renderApp(data = {}) {
  const app = document.getElementById('app');
  if (!app) return;
  let html = '';

  // Navigation bar
  html += renderNavbar();

  // Route content
  switch (currentRoute) {
    case 'home':
      html += renderHome();
      break;
    case 'login':
      html += renderLogin();
      break;
    case 'select-role':
      html += renderRoleSelection();
      break;
    case 'dashboard':
      html += renderDashboard();
      break;
    case 'post-job':
      html += renderPostJob();
      break;
    case 'job':
      html += renderJobDetail(data.jobId);
      break;
    case 'applications':
      html += renderApplications();
      break;
    case 'saved':
      html += renderSavedJobs();
      break;
    case 'profile':
      html += renderProfile();
      break;
    case 'admin':
      html += renderAdminPanel();
      break;
    default:
      html += `<div class="text-center py-20"><h2 class="text-2xl font-bold">Page not found</h2></div>`;
  }

  app.innerHTML = html;
  attachEventListeners();
}

// -------------------------------------------------------------
// NAVBAR
function renderNavbar() {
  const darkMode = localStorage.getItem('darkMode') === 'true';
  return `
    <nav class="flex flex-wrap items-center justify-between bg-white dark:bg-gray-800 shadow-md rounded-xl mb-8 p-4 transition-smooth">
      <div class="flex items-center gap-2 cursor-pointer" onclick="navigate('home')">
        <span class="text-2xl">💼</span>
        <span class="text-xl font-bold text-primary">Seek On</span>
      </div>
      <div class="flex items-center gap-3 mt-2 sm:mt-0">
        ${currentUser ? `
          <button onclick="navigate('dashboard')" class="text-sm px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700">Dashboard</button>
          <button onclick="signOut()" class="text-sm px-3 py-1 rounded-full bg-red-100 text-red-700">Logout</button>
        ` : `
          <button onclick="navigate('login')" class="text-sm px-4 py-2 bg-blue-600 text-white rounded-full">Sign In</button>
        `}
        <button onclick="toggleDarkMode()" class="p-2 rounded-full bg-gray-200 dark:bg-gray-600">${darkMode ? '☀️' : '🌙'}</button>
      </div>
    </nav>
  `;
}

// -------------------------------------------------------------
// HOME PAGE (public job listings + search)
async function renderHome() {
  let html = `
    <div class="text-center mb-12">
      <h1 class="text-4xl md:text-5xl font-bold mb-4">Find Your Dream Job</h1>
      <p class="text-gray-600 dark:text-gray-300">Search thousands of jobs from top employers</p>
      <div class="mt-8 max-w-2xl mx-auto flex flex-col sm:flex-row gap-3">
        <input id="searchInput" type="text" placeholder="Job title, keyword or company" class="flex-1 p-3 rounded-full border border-gray-300 dark:bg-gray-700 dark:border-gray-600">
        <button id="searchBtn" class="bg-blue-600 text-white px-6 py-3 rounded-full">Search</button>
      </div>
      <div class="mt-4 flex flex-wrap justify-center gap-3">
        <select id="filterType" class="p-2 rounded-full border border-gray-300 dark:bg-gray-700">
          <option value="">All Types</option>
          <option value="full-time">Full-time</option>
          <option value="part-time">Part-time</option>
          <option value="freelance">Freelance</option>
        </select>
        <select id="filterRemote" class="p-2 rounded-full border border-gray-300 dark:bg-gray-700">
          <option value="">Any</option>
          <option value="true">Remote</option>
          <option value="false">On-site</option>
        </select>
        <input id="filterSalary" type="text" placeholder="Min salary" class="p-2 rounded-full border border-gray-300 dark:bg-gray-700 w-28">
      </div>
    </div>
    <div id="jobsContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div class="col-span-full text-center py-10">Loading jobs...</div>
    </div>
  `;
  // Load jobs asynchronously
  setTimeout(() => loadPublicJobs(), 100);
  return html;
}

async function loadPublicJobs(filters = {}) {
  const container = document.getElementById('jobsContainer');
  if (!container) return;
  try {
    let query = db.collection('jobs').where('expiryDate', '>', new Date().toISOString());
    const snapshot = await query.limit(20).get();
    let jobs = [];
    snapshot.forEach(doc => jobs.push({ id: doc.id, ...doc.data() }));

    // Apply filters
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      jobs = jobs.filter(j => j.title.toLowerCase().includes(kw) || j.companyName?.toLowerCase().includes(kw));
    }
    if (filters.type) jobs = jobs.filter(j => j.type === filters.type);
    if (filters.remote === 'true') jobs = jobs.filter(j => j.remote === true);
    if (filters.remote === 'false') jobs = jobs.filter(j => j.remote === false);
    if (filters.minSalary) jobs = jobs.filter(j => parseInt(j.salaryRange?.min) >= parseInt(filters.minSalary));

    if (jobs.length === 0) {
      container.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500">No jobs found. Be the first to post one!</div>';
      return;
    }

    container.innerHTML = jobs.map(job => `
      <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 transition-smooth hover:shadow-lg cursor-pointer" onclick="navigate('job', { jobId: '${job.id}' })">
        <div class="flex justify-between items-start mb-3">
          <h3 class="text-lg font-semibold">${job.title}</h3>
          ${job.boosted ? '<span class="premium-badge text-xs px-2 py-1 rounded-full">Featured</span>' : ''}
        </div>
        <p class="text-sm text-gray-500 mb-2">${job.companyName}</p>
        <div class="flex flex-wrap gap-2 text-xs">
          <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">${job.type || 'Full-time'}</span>
          <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full">${job.remote ? 'Remote' : 'On-site'}</span>
          ${job.salaryRange ? `<span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">$${job.salaryRange.min}-${job.salaryRange.max}</span>` : ''}
        </div>
        <p class="text-gray-600 dark:text-gray-300 mt-3 line-clamp-2">${job.description?.substring(0, 100)}...</p>
      </div>
    `).join('');
  } catch (error) {
    container.innerHTML = `<div class="col-span-full text-center text-red-500">Error loading jobs: ${error.message}</div>`;
  }
}

// -------------------------------------------------------------
// AUTHENTICATION
function renderLogin() {
  return `
    <div class="max-w-md mx-auto mt-20 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
      <h2 class="text-2xl font-bold mb-6 text-center">Sign in to Seek On</h2>
      <div class="space-y-3">
        <button onclick="signInWithGoogle()" class="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 p-3 rounded-lg hover:bg-gray-50">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-5"> Google
        </button>
        <button onclick="signInWithGitHub()" class="w-full flex items-center justify-center gap-3 bg-gray-900 text-white p-3 rounded-lg hover:bg-gray-800">
          🐙 GitHub (configure provider)
        </button>
        <button onclick="signInWithMicrosoft()" class="w-full flex items-center justify-center gap-3 bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600">
          🔷 Microsoft (configure Azure AD)
        </button>
        <button onclick="signInWithApple()" class="w-full flex items-center justify-center gap-3 bg-black text-white p-3 rounded-lg hover:bg-gray-900">
          🍎 Apple (configure Developer)
        </button>
        <div class="relative my-4"><div class="border-t border-gray-300"></div><span class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 px-2 text-sm text-gray-500">or</span></div>
        <input id="emailInput" type="email" placeholder="Email" class="w-full p-3 border rounded-lg dark:bg-gray-700">
        <input id="passwordInput" type="password" placeholder="Password" class="w-full p-3 border rounded-lg dark:bg-gray-700">
        <button onclick="signInWithEmail()" class="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700">Sign In</button>
        <button onclick="registerWithEmail()" class="w-full text-blue-600 text-sm">Create account</button>
      </div>
    </div>
  `;
}

// Auth functions (simplified – providers need real config)
function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(alert);
}
function signInWithGitHub() {
  const provider = new firebase.auth.GithubAuthProvider();
  auth.signInWithPopup(provider).catch(e => alert('GitHub provider needs to be enabled in Firebase console.'));
}
function signInWithMicrosoft() {
  const provider = new firebase.auth.OAuthProvider('microsoft.com');
  auth.signInWithPopup(provider).catch(e => alert('Azure AD not configured.'));
}
function signInWithApple() {
  const provider = new firebase.auth.OAuthProvider('apple.com');
  auth.signInWithPopup(provider).catch(e => alert('Apple Sign In not configured.'));
}
async function signInWithEmail() {
  const email = document.getElementById('emailInput').value;
  const password = document.getElementById('passwordInput').value;
  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (e) { alert(e.message); }
}
async function registerWithEmail() {
  const email = document.getElementById('emailInput').value;
  const password = document.getElementById('passwordInput').value;
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    // Role selection will follow
  } catch (e) { alert(e.message); }
}
async function signOut() {
  await auth.signOut();
  navigate('home');
}

// -------------------------------------------------------------
// ROLE SELECTION (first login)
function renderRoleSelection() {
  return `
    <div class="max-w-md mx-auto mt-20 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg text-center">
      <h2 class="text-2xl font-bold mb-4">Choose your role</h2>
      <p class="mb-6 text-gray-500">This helps us personalize your experience</p>
      <button onclick="setRole('seeker')" class="w-full bg-blue-600 text-white p-4 rounded-xl mb-3 hover:bg-blue-700">🔍 I'm a Job Seeker</button>
      <button onclick="setRole('employer')" class="w-full bg-green-600 text-white p-4 rounded-xl hover:bg-green-700">🏢 I'm an Employer</button>
    </div>
  `;
}

async function setRole(role) {
  if (!currentUser) return;
  const userRef = db.collection('users').doc(currentUser.uid);
  await userRef.set({
    uid: currentUser.uid,
    name: currentUser.displayName || 'User',
    email: currentUser.email,
    role: role,
    photoURL: currentUser.photoURL || '',
    skills: [],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  userProfile = (await userRef.get()).data();
  navigate('dashboard');
}

// -------------------------------------------------------------
// DASHBOARD (role-based)
function renderDashboard() {
  if (!userProfile) return '<div class="text-center py-20">Loading...</div>';
  if (userProfile.role === 'seeker') return renderSeekerDashboard();
  if (userProfile.role === 'employer') return renderEmployerDashboard();
  if (userProfile.role === 'admin') return renderAdminPanel();
  return '<div class="text-center py-20">Unknown role</div>';
}

// SEEKER DASHBOARD
function renderSeekerDashboard() {
  return `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="md:col-span-2 space-y-6">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow">
          <h3 class="text-xl font-bold mb-4">🔍 Job Recommendations</h3>
          <div id="recommendedJobs">Loading...</div>
        </div>
        <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow">
          <h3 class="text-xl font-bold mb-4">📬 My Applications</h3>
          <div id="myApplications">Loading...</div>
        </div>
      </div>
      <div class="space-y-6">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow">
          <h3 class="text-xl font-bold mb-4">⚡ Quick Actions</h3>
          <button onclick="navigate('home')" class="w-full bg-blue-600 text-white p-3 rounded-lg mb-2">Search Jobs</button>
          <button onclick="navigate('saved')" class="w-full bg-gray-200 dark:bg-gray-700 p-3 rounded-lg mb-2">⭐ Saved Jobs</button>
          <button onclick="navigate('profile')" class="w-full bg-gray-200 dark:bg-gray-700 p-3 rounded-lg">Edit Profile</button>
        </div>
        <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow">
          <h3 class="text-xl font-bold mb-4">📈 Profile Strength</h3>
          <div class="w-full bg-gray-300 rounded-full h-3"><div class="bg-blue-600 h-3 rounded-full" style="width: ${calculateProfileStrength()}%"></div></div>
          <p class="text-sm mt-2">${calculateProfileStrength()}% complete</p>
        </div>
      </div>
    </div>
  `;
}

function calculateProfileStrength() {
  let p = 30;
  if (userProfile.skills?.length) p += 30;
  if (userProfile.resumeURL) p += 40;
  return p;
}

// EMPLOYER DASHBOARD
function renderEmployerDashboard() {
  return `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="md:col-span-2">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold">Your Job Listings</h2>
          <button onclick="navigate('post-job')" class="bg-green-600 text-white px-4 py-2 rounded-full">+ Post New Job</button>
        </div>
        <div id="employerJobs" class="space-y-4">Loading...</div>
      </div>
      <div class="space-y-6">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow">
          <h3 class="text-xl font-bold mb-4">📊 Quick Stats</h3>
          <div id="employerStats">Loading...</div>
        </div>
        <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow">
          <h3 class="text-xl font-bold mb-4">🚀 Boost Your Jobs</h3>
          <button onclick="boostJob()" class="w-full bg-yellow-500 text-white p-3 rounded-lg">Boost (7 days - $9.99)</button>
        </div>
      </div>
    </div>
  `;
}

// Dynamic loading functions attached after render
function attachEventListeners() {
  // Search button on home
  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) {
    searchBtn.onclick = () => {
      const keyword = document.getElementById('searchInput')?.value;
      const type = document.getElementById('filterType')?.value;
      const remote = document.getElementById('filterRemote')?.value;
      const minSalary = document.getElementById('filterSalary')?.value;
      loadPublicJobs({ keyword, type, remote, minSalary });
    };
  }
  // Dashboard async contents
  if (currentRoute === 'dashboard' && userProfile) {
    if (userProfile.role === 'seeker') {
      loadRecommendedJobs();
      loadMyApplications();
    } else if (userProfile.role === 'employer') {
      loadEmployerJobs();
      loadEmployerStats();
    }
  }
  if (currentRoute === 'job') {
    const jobId = window.jobDetailId; // set during renderJobDetail
    if (jobId) loadJobDetail(jobId);
  }
  if (currentRoute === 'applications') loadApplicationsList();
  if (currentRoute === 'saved') loadSavedJobs();
  if (currentRoute === 'admin') loadAdminStats();
}

// ---------- SEEKER FEATURES ----------
async function loadRecommendedJobs() {
  const el = document.getElementById('recommendedJobs');
  if (!el) return;
  try {
    const snapshot = await db.collection('jobs').where('expiryDate', '>', new Date().toISOString()).limit(5).get();
    let jobs = [];
    snapshot.forEach(d => jobs.push({ id: d.id, ...d.data() }));
    el.innerHTML = jobs.length ? jobs.map(j => `<div class="p-3 border-b last:border-0 cursor-pointer" onclick="navigate('job', { jobId: '${j.id}' })">${j.title} at ${j.companyName}</div>`).join('') : '<p>No recommendations yet.</p>';
  } catch(e) { el.innerHTML = 'Error'; }
}

async function loadMyApplications() {
  const el = document.getElementById('myApplications');
  if (!el) return;
  const snapshot = await db.collection('applications').where('applicantId', '==', currentUser.uid).get();
  let apps = [];
  snapshot.forEach(d => apps.push({ id: d.id, ...d.data() }));
  el.innerHTML = apps.length ? apps.map(a => `<div class="p-3 border-b">${a.jobTitle || 'Job'} - Status: ${a.status}</div>`).join('') : '<p>No applications yet.</p>';
}

// ---------- EMPLOYER FEATURES ----------
async function loadEmployerJobs() {
  const el = document.getElementById('employerJobs');
  if (!el) return;
  const snapshot = await db.collection('jobs').where('employerId', '==', currentUser.uid).get();
  let jobs = [];
  snapshot.forEach(d => jobs.push({ id: d.id, ...d.data() }));
  el.innerHTML = jobs.length ? jobs.map(j => `
    <div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow flex justify-between items-center">
      <div>
        <h4 class="font-bold">${j.title}</h4>
        <p class="text-sm text-gray-500">Applicants: ${j.applicantCount || 0}</p>
      </div>
      <div>
        <button onclick="viewApplicants('${j.id}')" class="text-blue-600 mr-2">View</button>
        <button onclick="deleteJob('${j.id}')" class="text-red-600">Delete</button>
      </div>
    </div>
  `).join('') : '<p>No jobs posted yet.</p>';
}

async function loadEmployerStats() {
  const el = document.getElementById('employerStats');
  if (!el) return;
  const total = (await db.collection('jobs').where('employerId', '==', currentUser.uid).get()).size;
  // In a real app, aggregate applicants
  el.innerHTML = `<p>Active Jobs: ${total}</p>`;
}

// ---------- JOB POSTING ----------
function renderPostJob() {
  return `
    <div class="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-2xl shadow">
      <h2 class="text-2xl font-bold mb-6">Post a New Job</h2>
      <form id="jobForm" class="space-y-4">
        <input id="jobTitle" placeholder="Job Title" required class="w-full p-3 border rounded-lg dark:bg-gray-700">
        <textarea id="jobDesc" placeholder="Description" rows="4" class="w-full p-3 border rounded-lg dark:bg-gray-700"></textarea>
        <input id="jobRequirements" placeholder="Requirements (comma separated)" class="w-full p-3 border rounded-lg dark:bg-gray-700">
        <div class="flex gap-4">
          <input id="salaryMin" type="number" placeholder="Min salary" class="w-1/2 p-3 border rounded-lg dark:bg-gray-700">
          <input id="salaryMax" type="number" placeholder="Max salary" class="w-1/2 p-3 border rounded-lg dark:bg-gray-700">
        </div>
        <input id="jobLocation" placeholder="Location" class="w-full p-3 border rounded-lg dark:bg-gray-700">
        <select id="jobType" class="w-full p-3 border rounded-lg dark:bg-gray-700">
          <option value="full-time">Full-time</option>
<option value="part-time">Part-time</option>
<option value="freelance">Freelance</option>
        </select>
        <label class="flex items-center gap-2"><input type="checkbox" id="jobRemote"> Remote friendly</label>
        <button type="submit" class="w-full bg-green-600 text-white p-3 rounded-lg">Post Job</button>
      </form>
    </div>
  `;
}
// (Event listener attached)

// ---------- JOB DETAIL + APPLY ----------
window.jobDetailId = null;
function renderJobDetail(data) {
  window.jobDetailId = data.jobId;
  return `<div id="jobDetailContainer" class="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-2xl shadow">Loading...</div>`;
}

async function loadJobDetail(jobId) {
  const container = document.getElementById('jobDetailContainer');
  if (!container) return;
  try {
    const doc = await db.collection('jobs').doc(jobId).get();
    if (!doc.exists) { container.innerHTML = 'Job not found.'; return; }
    const job = doc.data();
    container.innerHTML = `
      <h1 class="text-3xl font-bold mb-2">${job.title}</h1>
      <p class="text-lg text-blue-600 mb-4">${job.companyName}</p>
      <div class="flex flex-wrap gap-2 mb-4">
        <span class="bg-gray-200 px-3 py-1 rounded-full text-sm">${job.type}</span>
        <span class="bg-gray-200 px-3 py-1 rounded-full text-sm">${job.remote ? 'Remote' : 'On-site'}</span>
        <span class="bg-gray-200 px-3 py-1 rounded-full text-sm">${job.location || 'Worldwide'}</span>
        ${job.salaryRange ? `<span class="bg-gray-200 px-3 py-1 rounded-full text-sm">$${job.salaryRange.min} - $${job.salaryRange.max}</span>` : ''}
      </div>
      <div class="my-6"><h3 class="font-bold text-lg">Description</h3><p>${job.description}</p></div>
      <div class="my-6"><h3 class="font-bold text-lg">Requirements</h3><p>${job.requirements || 'Not specified'}</p></div>
      ${currentUser && userProfile?.role === 'seeker' ? `
        <div class="mt-8 border-t pt-6">
          <h3 class="text-xl font-bold mb-3">Apply for this job</h3>
          <textarea id="coverLetter" placeholder="Cover letter (optional)" rows="3" class="w-full p-3 border rounded-lg mb-3 dark:bg-gray-700"></textarea>
          <input type="file" id="cvUpload" accept=".pdf,.doc,.docx" class="mb-3">
          <button onclick="applyToJob('${jobId}')" class="bg-blue-600 text-white px-6 py-2 rounded-full">Submit Application</button>
        </div>
      ` : ''}
      ${currentUser && userProfile?.role === 'employer' ? `<p class="text-gray-500 mt-8">Employers cannot apply for jobs.</p>` : ''}
    `;
    // If not logged in, show login prompt
    if (!currentUser) {
      container.innerHTML += `<div class="mt-6 text-center"><a href="javascript:void(0)" onclick="navigate('login')" class="text-blue-600">Sign in to apply</a></div>`;
    }
  } catch(e) { container.innerHTML = 'Error loading job'; }
}

async function applyToJob(jobId) {
  if (!currentUser || userProfile.role !== 'seeker') return alert('Only seekers can apply.');
  const coverLetter = document.getElementById('coverLetter')?.value || '';
  const file = document.getElementById('cvUpload')?.files[0];
  let resumeURL = userProfile.resumeURL || '';
  if (file) {
    const storageRef = storage.ref(`cvs/${currentUser.uid}/${file.name}`);
    await storageRef.put(file);
    resumeURL = await storageRef.getDownloadURL();
    // Update user profile
    await db.collection('users').doc(currentUser.uid).update({ resumeURL });
  }
  const appRef = db.collection('applications').doc();
  await appRef.set({
    applicationId: appRef.id,
    jobId,
    applicantId: currentUser.uid,
    employerId: (await db.collection('jobs').doc(jobId).get()).data().employerId,
    resumeURL,
    coverLetter,
    status: 'applied',
    appliedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  alert('Application submitted!');
}

// ---------- SAVED JOBS ----------
function renderSavedJobs() {
  return `<div class="max-w-3xl mx-auto"><h2 class="text-2xl font-bold mb-6">⭐ Saved Jobs</h2><div id="savedJobsList">Loading...</div></div>`;
}
async function loadSavedJobs() {
  const el = document.getElementById('savedJobsList');
  if (!el) return;
  const snapshot = await db.collection('savedJobs').where('userId', '==', currentUser.uid).get();
  let jobs = [];
  for (const docSnap of snapshot.docs) {
    const jobDoc = await db.collection('jobs').doc(docSnap.data().jobId).get();
    if (jobDoc.exists) jobs.push({ id: jobDoc.id, ...jobDoc.data() });
  }
  el.innerHTML = jobs.length ? jobs.map(j => `<div class="p-3 border-b cursor-pointer" onclick="navigate('job', { jobId: '${j.id}' })">${j.title} – ${j.companyName}</div>`).join('') : '<p>No saved jobs.</p>';
}

// ---------- PROFILE ----------
function renderProfile() {
  return `
    <div class="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-2xl shadow">
      <h2 class="text-2xl font-bold mb-4">Edit Profile</h2>
      <div class="space-y-4">
        <div class="flex items-center gap-4">
          <img src="${userProfile.photoURL || 'https://via.placeholder.com/80'}" class="w-16 h-16 rounded-full">
          <button onclick="uploadProfilePic()" class="text-blue-600">Change photo</button>
        </div>
        <input id="profileName" value="${userProfile.name || ''}" placeholder="Name" class="w-full p-3 border rounded-lg dark:bg-gray-700">
        <input id="profileSkills" value="${(userProfile.skills || []).join(', ')}" placeholder="Skills (comma separated)" class="w-full p-3 border rounded-lg dark:bg-gray-700">
        <button onclick="saveProfile()" class="bg-blue-600 text-white px-4 py-2 rounded-full">Save</button>
      </div>
    </div>
  `;
}
async function saveProfile() {
  const name = document.getElementById('profileName').value;
  const skills = document.getElementById('profileSkills').value.split(',').map(s => s.trim());
  await db.collection('users').doc(currentUser.uid).update({ name, skills });
  userProfile = (await db.collection('users').doc(currentUser.uid).get()).data();
  alert('Profile updated');
}

// ---------- ADMIN PANEL ----------
function renderAdminPanel() {
  return `<div class="text-center py-20"><h2 class="text-2xl font-bold">Admin Panel</h2><p>User management, analytics, etc. (coming soon)</p></div>`;
}
function loadAdminStats() { /* placeholder */ }

// ---------- DARK MODE TOGGLE ----------
function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('darkMode', isDark);
}
if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark');
}

// ---------- POST JOB EVENT LISTENER ----------
document.addEventListener('submit', async (e) => {
  if (e.target.id === 'jobForm') {
    e.preventDefault();
    if (!currentUser || userProfile.role !== 'employer') return alert('Only employers can post jobs.');
    const title = document.getElementById('jobTitle').value;
    const description = document.getElementById('jobDesc').value;
    const requirements = document.getElementById('jobRequirements').value;
    const salaryMin = parseInt(document.getElementById('salaryMin').value) || 0;
    const salaryMax = parseInt(document.getElementById('salaryMax').value) || 0;
    const location = document.getElementById('jobLocation').value;
    const type = document.getElementById('jobType').value;
    const remote = document.getElementById('jobRemote').checked;
    const jobRef = db.collection('jobs').doc();
    await jobRef.set({
      jobId: jobRef.id,
      title,
      description,
      requirements,
      salaryRange: { min: salaryMin, max: salaryMax },
      location,
      type,
      remote,
      employerId: currentUser.uid,
      companyName: userProfile.companyName || 'My Company',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      boosted: false,
      expiryDate: new Date(Date.now() + 30*24*60*60*1000).toISOString()
    });
    alert('Job posted successfully!');
    navigate('dashboard');
  }
});

// ---------- INITIAL LOAD ----------
if (window.location.hash) {
  currentRoute = window.location.hash.slice(1);
} else {
  currentRoute = 'home';
  window.location.hash = 'home';
}
renderApp();