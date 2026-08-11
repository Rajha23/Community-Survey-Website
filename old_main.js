import { surveyQuestions } from './surveyData.js';
import { auth, db, functions } from './firebaseConfig.js';
import { httpsCallable } from 'firebase/functions';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  getDocs, 
  setDoc, 
  doc, 
  getDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Create a secondary app for admin user creation without logging out the admin
const secondaryApp = initializeApp({
  projectId: "community-survey-app",
  appId: "1:781858141684:web:5f33f3d9d534fe0671f5a1",
  storageBucket: "community-survey-app.firebasestorage.app",
  apiKey: "AIzaSyDnlyFJgb09hlGth05esWyxcfSmlQD9HSY",
  authDomain: "community-survey-app.firebaseapp.com",
  messagingSenderId: "781858141684"
}, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

// Elements
const views = {
  welcome: document.getElementById('view-welcome'),
  register: document.getElementById('view-register'),
  login: document.getElementById('view-login'),
  studentDashboard: document.getElementById('view-student-dashboard'),
  adminDashboard: document.getElementById('view-admin-dashboard')
};

const forms = {
  register: document.getElementById('form-register'),
  login: document.getElementById('form-login'),
  adminLogin: document.getElementById('form-admin'),
  survey: document.getElementById('survey-form'),
  profile: document.getElementById('profile-form')
};

let currentUser = null;
let currentUserData = null;

// Ensure default Admin exists in Firestore (for demo purposes)
async function ensureDefaultAdmin() {
  try {
    let adminUid;
    try {
      // Try to sign in first to get the UID if they already exist
      const userCred = await signInWithEmailAndPassword(secondaryAuth, 'admin@trp.srmtrichy.edu.in', 'admin123');
      adminUid = userCred.user.uid;
      // Sign out of secondary auth so we don't hold the session unnecessarily
      await signOut(secondaryAuth);
    } catch (e) {
      // If they don't exist, create them
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, 'admin@trp.srmtrichy.edu.in', 'admin123');
      adminUid = userCred.user.uid;
      await signOut(secondaryAuth);
    }

    // Now make sure their role document exists in Firestore using the correct Auth UID
    const adminDoc = await getDoc(doc(db, 'users', adminUid));
    if (!adminDoc.exists()) {
      await setDoc(doc(db, 'users', adminUid), { id: '1001', email: 'admin@trp.srmtrichy.edu.in', role: 'admin' });
    }
  } catch (error) {
    console.error("Error setting up default admin:", error);
  }
}
ensureDefaultAdmin();

// Routing logic
window.switchView = function(viewId) {
  const allViews = [
    document.getElementById('view-welcome'),
    document.getElementById('view-register'),
    document.getElementById('view-login'),
    document.getElementById('view-admin'),
    document.getElementById('view-student-dashboard'),
    document.getElementById('view-admin-dashboard')
  ];
  
  allViews.forEach(v => {
    if (v) {
      v.classList.remove('active-view');
      v.style.display = 'none';
    }
  });
  
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.add('active-view');
    targetView.style.display = 'block';
  }
}

document.querySelectorAll('[data-target]').forEach(el => {
  el.addEventListener('click', (e) => {
    const target = e.currentTarget.getAttribute('data-target');
    if (e.currentTarget.classList.contains('logout-btn')) {
      signOut(auth).then(() => {
        currentUser = null;
        currentUserData = null;
        window.switchView(target);
      });
    } else {
      window.switchView(target);
    }
  });
});

// Watch Auth State
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      currentUserData = userDoc.data();
      if (currentUserData.role === 'admin') {
        loadAdminDashboard();
        window.switchView('view-admin-dashboard');
      } else {
        // Pre-fill Personal Details
        document.getElementById('pd-reg').value = currentUserData.id || '';
        document.getElementById('pd-email').value = currentUserData.email || '';
        document.getElementById('pd-name').value = currentUserData.name || '';
        document.getElementById('pd-mobile').value = currentUserData.mobile || '';
        document.getElementById('pd-dept').value = currentUserData.department || '';
        
        // Lock Personal Details if already submitted
        if (currentUserData.name && currentUserData.mobile && currentUserData.department) {
          ['pd-name', 'pd-mobile', 'pd-dept'].forEach(id => {
            const el = document.getElementById(id);
            el.disabled = true;
            el.classList.add('opacity-70', 'cursor-not-allowed');
            el.classList.remove('bg-black/50');
            el.classList.add('bg-black/30');
          });
          const saveBtn = document.getElementById('btn-save-pd');
          saveBtn.disabled = true;
          saveBtn.innerText = 'Saved (Locked)';
          saveBtn.classList.remove('hover:scale-105', 'bg-brand-green', 'text-black', 'shadow-brand-green/20');
          saveBtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-white/10', 'text-white/50');
        }
        
        window.switchView('view-student-dashboard');
      }
    }
  }
});


// Auth Handlers
forms.register.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const regId = document.getElementById('reg-number').value;
  
  if (!email.endsWith('@trp.srmtrichy.edu.in')) {
    alert('Please use a valid @trp.srmtrichy.edu.in email address.');
    return;
  }
  
  try {
    // Check if Register ID is already in use
    const qId = query(collection(db, 'users'), where('id', '==', regId));
    const querySnapshot = await getDocs(qId);
    if (!querySnapshot.empty) {
      alert('Registration failed: Register ID already in use.');
      return;
    }

    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', userCred.user.uid), {
      id: regId,
      email: email,
      role: 'student'
    });
    forms.register.reset();
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      alert('Registration failed: Email is already registered.');
    } else {
      alert('Registration failed: ' + error.message);
    }
  }
});

forms.login.addEventListener('submit', (e) => {
  e.preventDefault();
  handleLoginSubmit(document.getElementById('login-email').value, document.getElementById('login-password').value, forms.login);
});

if (forms.adminLogin) {
  forms.adminLogin.addEventListener('submit', (e) => {
    e.preventDefault();
    handleLoginSubmit(document.getElementById('admin-email').value, document.getElementById('admin-password').value, forms.adminLogin);
  });
}

async function handleLoginSubmit(email, password, formElement) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    if (formElement) formElement.reset();
  } catch (error) {
    alert('Invalid email or password');
  }
}


/* =========================================
   Survey Logic
   ========================================= */
const QUESTIONS_PER_PAGE = 10;
let currentSurveyPage = 1;
const totalPages = Math.ceil(surveyQuestions.length / QUESTIONS_PER_PAGE);

function renderAllQuestions() {
  const container = document.getElementById('survey-questions-container');
  container.innerHTML = '';
  
  surveyQuestions.forEach((q, globalIdx) => {
    const qDiv = document.createElement('div');
    const pageNum = Math.floor(globalIdx / QUESTIONS_PER_PAGE) + 1;
    qDiv.className = `survey-question mb-8 question-page-${pageNum}`;
    
    let html = `<h4 class="text-xl font-medium text-white mb-4">${q.text}</h4><div class="space-y-3">`;
    
    q.options.forEach((opt, idx) => {
      const isOther = opt.toLowerCase().includes('other');
      const inputId = `${q.id}_opt_${idx}`;
      const name = q.type === 'radio' ? q.id : `${q.id}[]`;
      
      html += `
        <label for="${inputId}" class="flex items-center cursor-pointer group">
          <input type="${q.type}" id="${inputId}" name="${name}" value="${opt}" 
                 data-limit="${q.limit}" class="peer hidden ${isOther ? 'has-other' : ''} survey-option-input" />
          <div class="flex-grow p-4 rounded-xl border border-white/10 bg-white/5 text-text-secondary group-hover:bg-white/10 transition-colors peer-checked:bg-brand-yellow/10 peer-checked:border-brand-yellow peer-checked:text-brand-yellow">
            ${opt}
          </div>
        </label>
      `;
      
      if (isOther) {
        html += `<input type="text" id="${inputId}_text" name="${q.id}_other_text" class="w-full mt-3 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-yellow transition-colors hidden" placeholder="Please specify..." />`;
      }
    });
    
    html += `</div>`;
    qDiv.innerHTML = html;
    container.appendChild(qDiv);
  });
  
  attachSurveyListeners();
}

function showSurveyPage(page) {
  document.querySelectorAll('.survey-question').forEach(el => el.style.display = 'none');
  document.querySelectorAll(`.question-page-${page}`).forEach(el => el.style.display = 'block');
  
  // Progress & Navigation update
  document.getElementById('wizard-page-title').innerText = `Page ${page} of ${totalPages}`;
  document.getElementById('survey-progress').style.width = `${(page / totalPages) * 100}%`;
  
  document.getElementById('btn-prev-page').style.display = page === 1 ? 'none' : 'block';
  if (page === totalPages) {
    document.getElementById('btn-next-page').style.display = 'none';
    document.getElementById('btn-submit-survey').style.display = 'block';
  } else {
    document.getElementById('btn-next-page').style.display = 'block';
    document.getElementById('btn-submit-survey').style.display = 'none';
  }
}

function attachSurveyListeners() {
  const container = document.getElementById('survey-questions-container');
  
  // Handle limits
  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const name = e.target.name;
      const limit = parseInt(e.target.getAttribute('data-limit') || 99);
      const checkedCount = container.querySelectorAll(`input[name="${name}"]:checked`).length;
      
      if (checkedCount > limit) {
        e.target.checked = false;
        alert(`You can only select up to ${limit} options for this question.`);
      }
    });
  });
  
  // Handle 'Other' text fields
  container.querySelectorAll('.has-other').forEach(radioOrCb => {
    radioOrCb.addEventListener('change', (e) => {
      const textInput = document.getElementById(`${e.target.id}_text`);
      if (textInput) {
        if (e.target.checked) {
          textInput.classList.remove('hidden');
        } else {
          textInput.classList.add('hidden');
        }
      }
    });
  });
}

let isSurveyRendered = false;

document.getElementById('btn-take-survey')?.addEventListener('click', () => {
  if (!currentUserData.name || !currentUserData.mobile || !currentUserData.department) {
    alert("Please fill out and save your Personal Details before starting the assessment.");
    return;
  }
  const communitySelect = document.getElementById('survey-community-select');
  if (!communitySelect || !communitySelect.value) {
    alert("Please select a target community before starting the assessment.");
    return;
  }

  // Show community profile form instead of wizard
  document.getElementById('btn-take-survey').style.display = 'none';
  document.getElementById('community-profile-container').style.display = 'block';
  document.getElementById('survey-success-message').style.display = 'none';
});

let globalCommunityProfile = null;

document.getElementById('community-profile-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  
  globalCommunityProfile = {
    name: document.getElementById('survey-community-select').options[document.getElementById('survey-community-select').selectedIndex]?.text || '',
    district: document.getElementById('cp-district').value,
    panchayat: document.getElementById('cp-panchayat').value,
    population: parseInt(document.getElementById('cp-population').value) || 0,
    respondents: parseInt(document.getElementById('cp-respondents').value) || 0,
    studentsInvolved: parseInt(document.getElementById('cp-students').value) || 0,
    occupation: document.getElementById('cp-occupation').value,
    crops: document.getElementById('cp-crops').value,
    schools: parseInt(document.getElementById('cp-schools').value) || 0,
    phc: parseInt(document.getElementById('cp-phc').value) || 0,
    waterBodies: document.getElementById('cp-water').value,
    majorIssues: document.getElementById('cp-issues').value,
  };

  document.getElementById('community-profile-container').style.display = 'none';
  document.getElementById('survey-wizard-container').style.display = 'block';
  
  currentSurveyPage = 1;
  if (!isSurveyRendered) {
    renderAllQuestions();
    isSurveyRendered = true;
  }
  showSurveyPage(currentSurveyPage);
});

document.getElementById('btn-next-page')?.addEventListener('click', () => {
  if (currentSurveyPage < totalPages) {
    currentSurveyPage++;
    showSurveyPage(currentSurveyPage);
  }
});

document.getElementById('btn-prev-page')?.addEventListener('click', () => {
  if (currentSurveyPage > 1) {
    currentSurveyPage--;
    showSurveyPage(currentSurveyPage);
  }
});

forms.survey?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Get all responses
  const formData = new FormData(forms.survey);
  const responses = {};
  for (let [key, value] of formData.entries()) {
    if (key.endsWith('[]')) {
      const cleanKey = key.replace('[]', '');
      if (!responses[cleanKey]) responses[cleanKey] = [];
      responses[cleanKey].push(value);
    } else {
      responses[key] = value;
    }
  }

  try {
    const communitySelect = document.getElementById('survey-community-select');
    const communityId = communitySelect.value;
    const communityName = communitySelect.options[communitySelect.selectedIndex].text;

    await addDoc(collection(db, 'surveys'), {
      userId: currentUserData.id,
      userEmail: currentUserData.email,
      communityId: communityId,
      communityName: communityName,
      date: new Date().toISOString(),
      responses: responses,
      communityProfile: globalCommunityProfile
    });
    
    document.getElementById('survey-wizard-container').style.display = 'none';
    document.getElementById('survey-success-message').style.display = 'block';
  } catch (error) {
    alert("Error submitting survey: " + error.message);
  }
});

document.getElementById('btn-back-to-dash')?.addEventListener('click', () => {
  document.getElementById('survey-success-message').style.display = 'none';
  document.getElementById('btn-take-survey').style.display = 'inline-block';
});

/* =========================================
   Personal Details Logic
   ========================================= */
document.getElementById('form-personal-details')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('pd-name').value;
  const mobile = document.getElementById('pd-mobile').value;
  const department = document.getElementById('pd-dept').value;
  
  const btn = document.getElementById('btn-save-pd');
  const originalText = btn.innerText;
  btn.innerText = 'Saving...';
  btn.disabled = true;
  
  try {
    // Check if mobile already exists
    const qMobile = query(collection(db, 'users'), where('mobile', '==', mobile));
    const mobileSnapshot = await getDocs(qMobile);
    
    let mobileInUse = false;
    mobileSnapshot.forEach((docSnap) => {
      if (docSnap.id !== currentUser.uid) {
        mobileInUse = true;
      }
    });

    if (mobileInUse) {
      alert('Save failed: Mobile number already in use by another account.');
      btn.innerText = originalText;
      btn.disabled = false;
      return;
    }

    await setDoc(doc(db, 'users', currentUser.uid), {
      name,
      mobile,
      department
    }, { merge: true });
    
    // Update local cache
    currentUserData.name = name;
    currentUserData.mobile = mobile;
    currentUserData.department = department;
    
    const msg = document.getElementById('pd-success-msg');
    msg.classList.remove('opacity-0');
    setTimeout(() => {
      msg.classList.add('opacity-0');
    }, 3000);
    
    // Lock the form fields immediately
    ['pd-name', 'pd-mobile', 'pd-dept'].forEach(id => {
      const el = document.getElementById(id);
      el.disabled = true;
      el.classList.add('opacity-70', 'cursor-not-allowed');
      el.classList.remove('bg-black/50');
      el.classList.add('bg-black/30');
    });
    btn.innerText = 'Saved (Locked)';
    btn.classList.remove('hover:scale-105', 'bg-brand-green', 'text-black', 'shadow-brand-green/20');
    btn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-white/10', 'text-white/50');
    
  } catch(error) {
    alert("Error saving details: " + error.message);
    btn.innerText = originalText;
    btn.disabled = false;
  }
});

/* =========================================
   Admin Logic
   ========================================= */
document.querySelectorAll('.admin-tab').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.admin-tab').forEach(b => {
      b.classList.remove('active-tab', 'bg-brand-green', 'text-black', 'shadow-lg', 'shadow-brand-green/20', 'font-semibold');
      b.classList.add('border', 'border-white/10', 'text-text-secondary', 'hover:text-white', 'hover:bg-white/5', 'font-medium');
    });
    const targetBtn = e.currentTarget;
    targetBtn.classList.add('active-tab', 'bg-brand-green', 'text-black', 'shadow-lg', 'shadow-brand-green/20', 'font-semibold');
    targetBtn.classList.remove('border', 'border-white/10', 'text-text-secondary', 'hover:text-white', 'hover:bg-white/5', 'font-medium');
    
    const tabName = targetBtn.getAttribute('data-tab');
    document.querySelectorAll('.admin-tab-content').forEach(c => {
      c.classList.remove('block');
      c.classList.add('hidden');
    });
    const content = document.getElementById(`tab-${tabName}`);
    content.classList.remove('hidden');
    content.classList.add('block');
  });
});

document.querySelectorAll('.profile-sub-tab').forEach(tab => {
  tab.addEventListener('click', (e) => {
    document.querySelectorAll('.profile-sub-tab').forEach(t => {
      t.classList.remove('active-sub-tab', 'bg-white/10', 'text-white', 'border-white/20');
      t.classList.add('text-text-secondary', 'border-white/10');
    });
    
    document.querySelectorAll('.profile-sub-content').forEach(c => {
      c.classList.remove('block');
      c.classList.add('hidden');
    });

    const targetId = e.target.getAttribute('data-subtab');
    e.target.classList.add('active-sub-tab', 'bg-white/10', 'text-white', 'border-white/20');
    e.target.classList.remove('text-text-secondary', 'border-white/10');
    
    const targetContent = document.getElementById(targetId);
    if (targetContent) {
      targetContent.classList.remove('hidden');
      targetContent.classList.add('block');
    }
  });
});

async function loadAdminDashboard() {
  await renderProfilesTable();
  await fetchAndRenderSurveys();
}

async function renderProfilesTable() {
  const adminsTbody = document.getElementById('admins-tbody');
  const studentsTbody = document.getElementById('students-tbody');
  adminsTbody.innerHTML = '';
  studentsTbody.innerHTML = '';
  
  const querySnapshot = await getDocs(collection(db, 'users'));
  querySnapshot.forEach(docSnap => {
    const u = docSnap.data();
    const docId = docSnap.id;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.id}</td>
      <td>${u.email}</td>
      <td>
        <div class="flex gap-4">
          <button class="text-brand-green hover:text-green-300 transition-colors btn-view-details flex items-center justify-center p-1" data-id="${docId}" title="View Details">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
          <button class="text-brand-yellow hover:text-[#F9EBD0] transition-colors btn-edit-profile flex items-center justify-center p-1" data-id="${docId}" title="Edit">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="text-red-400 hover:text-red-300 transition-colors btn-delete-profile flex items-center justify-center p-1" data-id="${docId}" title="Delete">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
      </td>
    `;
    if (u.role === 'admin') {
      adminsTbody.appendChild(tr);
    } else {
      studentsTbody.appendChild(tr);
    }
  });
  
  document.querySelectorAll('.btn-edit-profile').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      openProfileModal(id);
    });
  });

  document.querySelectorAll('.btn-delete-profile').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (confirm("Are you sure you want to delete this profile?")) {
         try {
           await deleteDoc(doc(db, 'users', id));
           await renderProfilesTable();
         } catch(error) {
           alert("Error deleting profile: " + error.message);
         }
      }
    });
  });

  document.querySelectorAll('.btn-view-details').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const content = document.getElementById('view-details-content');
      content.innerHTML = '<div class="text-center text-text-muted py-8">Loading...</div>';
      document.getElementById('view-details-modal').style.display = 'flex';
      
      try {
        const docSnap = await getDoc(doc(db, 'users', id));
        if (docSnap.exists()) {
          const user = docSnap.data();
          content.innerHTML = `
            <div class="grid grid-cols-2 gap-y-6 gap-x-4">
              <div><span class="text-text-muted block mb-1 text-xs uppercase tracking-wider">Full Name</span><span class="text-white font-medium">${user.name || '-'}</span></div>
              <div><span class="text-text-muted block mb-1 text-xs uppercase tracking-wider">Role</span><span class="text-white font-medium capitalize">${user.role || '-'}</span></div>
              <div><span class="text-text-muted block mb-1 text-xs uppercase tracking-wider">Register Number</span><span class="text-white font-medium">${user.id || '-'}</span></div>
              <div><span class="text-text-muted block mb-1 text-xs uppercase tracking-wider">Department</span><span class="text-white font-medium">${user.department || '-'}</span></div>
              <div><span class="text-text-muted block mb-1 text-xs uppercase tracking-wider">Mobile Number</span><span class="text-white font-medium">${user.mobile || '-'}</span></div>
              <div class="col-span-2"><span class="text-text-muted block mb-1 text-xs uppercase tracking-wider">Email Address</span><span class="text-white font-medium">${user.email || '-'}</span></div>
            </div>
          `;
        } else {
          content.innerHTML = '<div class="text-red-400">User not found</div>';
        }
      } catch(err) {
        content.innerHTML = '<div class="text-red-400">Error: ' + err.message + '</div>';
      }
    });
  });
}

let allSurveys = [];
let surveySortDesc = true;
let filterDateStr = '';

async function fetchAndRenderSurveys() {
  const querySnapshot = await getDocs(collection(db, 'surveys'));
  allSurveys = [];
  querySnapshot.forEach(docSnap => {
    allSurveys.push({ id: docSnap.id, ...docSnap.data() });
  });
  renderRecordsTable();
}

function renderRecordsTable() {
  const tbody = document.getElementById('records-tbody');
  tbody.innerHTML = '';
  
  let displaySurveys = allSurveys;
  if (filterDateStr) {
    displaySurveys = allSurveys.filter(s => {
      const localD = new Date(s.date);
      const year = localD.getFullYear();
      const month = String(localD.getMonth() + 1).padStart(2, '0');
      const day = String(localD.getDate()).padStart(2, '0');
      const localDateStr = `${year}-${month}-${day}`;
      return localDateStr === filterDateStr;
    });
  }

  if (displaySurveys.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-text-muted">No surveys found.</td></tr>';
    return;
  }
  
  displaySurveys.sort((a, b) => {
    const dA = new Date(a.date).getTime();
    const dB = new Date(b.date).getTime();
    return surveySortDesc ? dB - dA : dA - dB;
  });
  
  displaySurveys.forEach(s => {
    const d = new Date(s.date);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.userId}</td>
      <td>${d.toLocaleString()}</td>
      <td>
        <button class="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs transition-colors btn-view-survey" data-id="${s.id}">View</button>
        <button class="px-4 py-2 rounded-lg bg-brand-yellow/10 hover:bg-brand-yellow/20 text-brand-yellow border border-brand-yellow/30 text-xs transition-colors btn-ai-survey ml-2" data-id="${s.userId}">AI Analysis</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  document.querySelectorAll('.btn-view-survey').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      openSurveyModal(id);
    });
  });
  
  document.querySelectorAll('.btn-ai-survey').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const userId = e.currentTarget.getAttribute('data-id');
      
      // Switch to AI Intelligence Tab
      document.querySelectorAll('.admin-tab').forEach(b => {
        b.classList.remove('active-tab', 'bg-brand-green', 'text-black', 'shadow-lg', 'shadow-brand-green/20', 'font-semibold');
        b.classList.add('border', 'border-white/10', 'text-text-secondary', 'hover:text-white', 'hover:bg-white/5', 'font-medium');
      });
      const aiTabBtn = document.querySelector('[data-tab="ai-intelligence"]');
      aiTabBtn.classList.add('active-tab', 'bg-brand-green', 'text-black', 'shadow-lg', 'shadow-brand-green/20', 'font-semibold');
      aiTabBtn.classList.remove('border', 'border-white/10', 'text-text-secondary', 'hover:text-white', 'hover:bg-white/5', 'font-medium');
      
      document.querySelectorAll('.admin-tab-content').forEach(c => {
        c.classList.remove('block');
        c.classList.add('hidden');
      });
      document.getElementById('tab-ai-intelligence').classList.remove('hidden');
      document.getElementById('tab-ai-intelligence').classList.add('block');
      
      // Clear community select if individual
      document.getElementById('ai-community-select').value = "";
      
      // Trigger AI Analysis
      await triggerAiAnalysis('individual', userId);
    });
  });
}

document.getElementById('sort-surveys-date')?.addEventListener('click', () => {
  surveySortDesc = !surveySortDesc;
  const icon = document.getElementById('sort-icon');
  if (surveySortDesc) {
    icon.innerHTML = '<line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline>';
  } else {
    icon.innerHTML = '<line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline>';
  }
  renderRecordsTable();
});

document.getElementById('filter-date')?.addEventListener('change', (e) => {
  filterDateStr = e.target.value;
  const btnClear = document.getElementById('btn-clear-date');
  if (filterDateStr) {
    btnClear.classList.remove('hidden');
  } else {
    btnClear.classList.add('hidden');
  }
  renderRecordsTable();
});

document.getElementById('btn-clear-date')?.addEventListener('click', () => {
  filterDateStr = '';
  document.getElementById('filter-date').value = '';
  document.getElementById('btn-clear-date').classList.add('hidden');
  renderRecordsTable();
});

document.getElementById('search-users')?.addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  
  const filterTable = (tbodyId) => {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
      if (row.cells.length < 2) return;
      const id = row.cells[0].innerText.toLowerCase();
      const email = row.cells[1].innerText.toLowerCase();
      if (id.includes(term) || email.includes(term)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  };
  
  filterTable('students-tbody');
  filterTable('admins-tbody');
});

// Survey Modal logic
const surveyModal = document.getElementById('survey-modal');

document.getElementById('btn-close-survey-modal')?.addEventListener('click', () => {
  surveyModal.style.display = 'none';
});

document.getElementById('btn-close-view-details-modal')?.addEventListener('click', () => {
  document.getElementById('view-details-modal').style.display = 'none';
});

async function openSurveyModal(docId) {
  const content = document.getElementById('survey-modal-content');
  const subtitle = document.getElementById('survey-modal-subtitle');
  
  content.innerHTML = '<div class="text-center text-text-muted py-8">Loading...</div>';
  surveyModal.style.display = 'flex';
  
  try {
    const docSnap = await getDoc(doc(db, 'surveys', docId));
    if (docSnap.exists()) {
      const data = docSnap.data();
      const d = new Date(data.date);
      subtitle.innerText = `Submitted by ${data.userId} on ${d.toLocaleString()}`;
      
      let html = '';
      const responses = data.responses || {};
      
      surveyQuestions.forEach(q => {
        const key = q.id;
        const value = responses[key];
        
        let valStr = '-';
        if (value !== undefined && value !== '') {
          valStr = Array.isArray(value) ? value.join(', ') : value;
          if (responses[`${key}_other_text`]) {
            valStr += ` (${responses[`${key}_other_text`]})`;
          }
        }
        
        html += `
          <div class="bg-black/30 p-4 rounded-xl border border-white/5">
            <h4 class="text-sm font-medium text-text-secondary mb-2">${q.text}</h4>
            <p class="text-white">${valStr}</p>
          </div>
        `;
      });
      
      content.innerHTML = html;
    }
  } catch(error) {
    content.innerHTML = `<div class="text-red-400">Error loading survey: ${error.message}</div>`;
  }
}

// Profile Modal logic
const profileModal = document.getElementById('profile-modal');

document.getElementById('btn-create-admin-profile')?.addEventListener('click', () => {
  openProfileModal(null, 'admin');
});

document.getElementById('btn-create-student-profile')?.addEventListener('click', () => {
  openProfileModal(null, 'student');
});

document.getElementById('btn-close-modal')?.addEventListener('click', () => {
  profileModal.style.display = 'none';
});

async function openProfileModal(userId = null, defaultRole = 'student') {
  forms.profile.reset();
  document.getElementById('edit-profile-id').value = '';
  document.getElementById('modal-title').innerText = userId ? 'Edit Profile' : 'Create Profile';
  
  const roleSelect = document.getElementById('modal-role');
  
  if (userId) {
    const docSnap = await getDoc(doc(db, 'users', userId));
    if (docSnap.exists()) {
      const user = docSnap.data();
      document.getElementById('edit-profile-id').value = userId;
      roleSelect.value = user.role || 'student';
      
      document.getElementById('modal-reg').value = user.id || '';
      document.getElementById('modal-email').value = user.email || '';
      
      document.getElementById('modal-name').value = user.name || '';
      document.getElementById('modal-mobile').value = user.mobile || '';
      document.getElementById('modal-dept').value = user.department || '';
      
      document.getElementById('modal-password').value = '********';
      document.getElementById('modal-password').disabled = true;
      document.getElementById('modal-password').classList.add('opacity-50', 'cursor-not-allowed');
    }
  } else {
    document.getElementById('modal-password').disabled = false;
    document.getElementById('modal-password').classList.remove('opacity-50', 'cursor-not-allowed');
    document.getElementById('modal-password').value = '';
    
    roleSelect.value = defaultRole;
  }
  
  profileModal.style.display = 'flex';
}

forms.profile?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const editId = document.getElementById('edit-profile-id').value;
  const role = document.getElementById('modal-role').value;
  const regId = document.getElementById('modal-reg').value;
  const email = document.getElementById('modal-email').value;
  const password = document.getElementById('modal-password').value;
  
  const name = document.getElementById('modal-name').value;
  const mobile = document.getElementById('modal-mobile').value;
  const department = document.getElementById('modal-dept').value;
  
  try {
    if (editId) {
      await setDoc(doc(db, 'users', editId), { id: regId, email, role, name, mobile, department }, { merge: true });
    } else {
      // Create via secondary Auth app so admin isn't logged out
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      await setDoc(doc(db, 'users', userCred.user.uid), { id: regId, email, role, name, mobile, department });
    }
    profileModal.style.display = 'none';
    await renderProfilesTable();
  } catch (error) {
    alert("Error saving profile: " + error.message);
  }
});

// ==========================================
// Community & AI Intelligence Logic
// ==========================================

async function loadCommunities() {
  const select1 = document.getElementById('survey-community-select');
  const select2 = document.getElementById('ai-community-select');
  const tbody = document.getElementById('communities-tbody');
  
  if(select1) select1.innerHTML = '<option value="" disabled selected>Select Target Community</option>';
  if(select2) select2.innerHTML = '<option value="" disabled selected>Select a community to analyze</option>';
  if(tbody) tbody.innerHTML = '';
  
  try {
    const snap = await getDocs(collection(db, 'communities'));
    snap.forEach(docSnap => {
      const c = docSnap.data();
      const optionHtml = `<option value="${docSnap.id}">${c.name} - ${c.district}</option>`;
      if(select1) select1.innerHTML += optionHtml;
      if(select2) select2.innerHTML += optionHtml;
      
      if(tbody) {
        tbody.innerHTML += `
          <tr>
            <td class="p-4 text-white font-medium">${c.name}</td>
            <td class="p-4">${c.district}</td>
            <td class="p-4">${c.population || '-'}</td>
            <td class="p-4">-</td>
          </tr>
        `;
      }
    });
  } catch (err) {
    console.error('Error loading communities:', err);
  }
}

document.getElementById('btn-create-community')?.addEventListener('click', async () => {
  const name = prompt("Enter Community Name:");
  if (!name) return;
  const district = prompt("Enter District:");
  const population = prompt("Enter Population (optional):");
  
  try {
    await addDoc(collection(db, 'communities'), {
      name,
      district,
      population
    });
    loadCommunities();
  } catch (e) {
    alert("Failed to create community: " + e.message);
  }
});

// Hook into app load to fetch communities
onAuthStateChanged(auth, async (user) => {
  if (user) loadCommunities();
});

document.getElementById('ai-community-select')?.addEventListener('change', (e) => {
  const btn = document.getElementById('btn-generate-community-ai');
  if(e.target.value) {
    btn.style.display = 'flex';
  }
});

async function triggerAiAnalysis(analysisType, referenceId, communityData = {}) {
  // Update UI State
  const dashboard = document.getElementById('ai-dashboard');
  const loadingState = document.getElementById('ai-loading-state');
  
  dashboard.classList.add('hidden');
  loadingState.classList.remove('hidden');
  loadingState.style.display = 'flex';
  
  try {
    // TASK 6: Fetch data from frontend to bypass ADC timeout
    let submissions = [];
    const surveysRef = collection(db, 'surveys');
    let q;
    
    if (analysisType === 'individual') {
      q = query(surveysRef, where('userId', '==', referenceId));
    } else {
      q = query(surveysRef, where('communityId', '==', referenceId));
    }
    
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => submissions.push(doc.data()));
    
    if (submissions.length === 0) {
      throw new Error("No survey records found for this selection.");
    }
    
    const generateAiAnalysis = httpsCallable(functions, 'generateAiAnalysis');
    const result = await generateAiAnalysis({
      analysisType,
      referenceId,
      communityData,
      submissions
    });
    
    const analysisDoc = result.data.analysis;
    
    // TASK 13: Save to Firestore
    await setDoc(doc(db, 'aiAnalysis', result.data.docId), analysisDoc);
    
    renderAiDashboard(analysisDoc.data);
  } catch (err) {
    console.error("AI Callable Error:", err);
    dashboard.classList.remove('hidden');
    
    const reason = err.message || 'An unknown error occurred.';
    
    dashboard.innerHTML = `
      <div class="bg-red-500/10 border border-red-500/50 rounded-2xl p-8 text-center max-w-2xl mx-auto mt-8">
        <div class="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <h3 class="text-red-400 font-bold text-2xl mb-2">AI Analysis Failed</h3>
        <p class="text-white text-lg">Reason: ${reason}</p>
        <p class="text-text-muted text-sm mt-6">Check the server logs for detailed technical information.</p>
      </div>
    `;
  } finally {
    loadingState.classList.add('hidden');
    loadingState.style.display = 'none';
  }
}

document.getElementById('btn-generate-community-ai')?.addEventListener('click', async () => {
  const communityId = document.getElementById('ai-community-select').value;
  if (!communityId) return;
  await triggerAiAnalysis('community', communityId, { id: communityId });
});

function renderAiDashboard(data) {
  document.getElementById('ai-dashboard').classList.remove('hidden');
  
  if (data._communityProfile) {
    const cp = data._communityProfile;
    document.getElementById('ai-out-top-profile').innerHTML = `
      <div class="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-8 shadow-lg">
        <div class="bg-brand-green/20 px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h4 class="text-brand-green font-bold text-lg flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            Community Profile Snapshot
          </h4>
        </div>
        <table class="w-full text-left text-sm text-white">
          <tbody class="divide-y divide-white/5">
            <tr class="hover:bg-white/5 transition-colors"><td class="py-3 px-6 font-medium text-text-secondary w-1/3">Community Name</td><td class="py-3 px-6">${cp.name || '-'}</td></tr>
            <tr class="hover:bg-white/5 transition-colors"><td class="py-3 px-6 font-medium text-text-secondary">District</td><td class="py-3 px-6">${cp.district || '-'}</td></tr>
            <tr class="hover:bg-white/5 transition-colors"><td class="py-3 px-6 font-medium text-text-secondary">Panchayat</td><td class="py-3 px-6">${cp.panchayat || '-'}</td></tr>
            <tr class="hover:bg-white/5 transition-colors"><td class="py-3 px-6 font-medium text-text-secondary">Population</td><td class="py-3 px-6">${cp.population || 0}</td></tr>
            <tr class="hover:bg-white/5 transition-colors"><td class="py-3 px-6 font-medium text-text-secondary">Respondents</td><td class="py-3 px-6">${cp.respondents || 0}</td></tr>
            <tr class="hover:bg-white/5 transition-colors"><td class="py-3 px-6 font-medium text-text-secondary">Students Involved</td><td class="py-3 px-6">${cp.studentsInvolved || 0}</td></tr>
            <tr class="hover:bg-white/5 transition-colors"><td class="py-3 px-6 font-medium text-text-secondary">Major Occupation</td><td class="py-3 px-6">${cp.occupation || '-'}</td></tr>
            <tr class="hover:bg-white/5 transition-colors"><td class="py-3 px-6 font-medium text-text-secondary">Major Crops</td><td class="py-3 px-6">${cp.crops || '-'}</td></tr>
            <tr class="hover:bg-white/5 transition-colors"><td class="py-3 px-6 font-medium text-text-secondary">Schools</td><td class="py-3 px-6">${cp.schools || 0}</td></tr>
            <tr class="hover:bg-white/5 transition-colors"><td class="py-3 px-6 font-medium text-text-secondary">PHC</td><td class="py-3 px-6">${cp.phc || 0}</td></tr>
            <tr class="hover:bg-white/5 transition-colors"><td class="py-3 px-6 font-medium text-text-secondary">Water Bodies</td><td class="py-3 px-6">${cp.waterBodies || '-'}</td></tr>
            <tr class="hover:bg-white/5 transition-colors"><td class="py-3 px-6 font-medium text-text-secondary">Major Issues</td><td class="py-3 px-6 text-brand-yellow">${cp.majorIssues || '-'}</td></tr>
          </tbody>
        </table>
      </div>
    `;
    document.getElementById('ai-out-top-profile').style.display = 'block';
  } else {
    document.getElementById('ai-out-top-profile').style.display = 'none';
  }
  
  if (data.communityProfile) {
    document.getElementById('ai-out-profile').innerHTML = `
      <p>${data.communityProfile.description || ''}</p>
      <div class="mt-2 text-brand-yellow"><strong>Major Issues:</strong> ${(data.communityProfile.majorIssues || []).join(', ')}</div>
    `;
  }
  
  if (data.communityPriorityIndex) {
    let cpiHtml = `
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-white">
          <thead class="text-xs text-text-muted uppercase border-b border-white/10 bg-black/20">
            <tr>
              <th class="py-3 px-4 rounded-tl-lg">Identified Problem</th>
              <th class="py-3 px-4 text-center">Score</th>
              <th class="py-3 px-4 rounded-tr-lg">Priority Level</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
    `;
    data.communityPriorityIndex.forEach(item => {
      let badgeColor = item.score > 80 ? 'bg-red-500/20 text-red-400 border-red-500/30' : 
                       item.score > 50 ? 'bg-brand-yellow/20 text-brand-yellow border-brand-yellow/30' : 
                       'bg-brand-green/20 text-brand-green border-brand-green/30';
      let priorityText = item.score > 80 ? 'Critical' : item.score > 50 ? 'High' : 'Moderate';
      
      cpiHtml += `
        <tr class="hover:bg-white/5 transition-colors group">
          <td class="py-4 px-4 font-medium text-white">${item.problem}</td>
          <td class="py-4 px-4 text-center"><span class="font-bold text-lg">${item.score}</span><span class="text-xs text-text-muted">/100</span></td>
          <td class="py-4 px-4">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeColor}">
              ${priorityText}
            </span>
          </td>
        </tr>
      `;
    });
    cpiHtml += '</tbody></table></div>';
    document.getElementById('ai-out-cpi').innerHTML = cpiHtml;
  }
  
  if (data.stakeholderMap) {
    document.getElementById('ai-out-stakeholders').innerHTML = `
      <div class="grid grid-cols-2 gap-4 h-full min-h-[300px]">
        <div class="bg-brand-yellow/10 border border-brand-yellow/20 rounded-xl p-4 hover:shadow-[0_0_15px_rgba(247,226,192,0.15)] transition-all">
          <h5 class="text-brand-yellow font-bold text-sm mb-3 flex items-center gap-2"><span>★</span> High Power, High Interest</h5>
          <ul class="list-disc pl-4 space-y-1 text-sm text-white/90">
            ${(data.stakeholderMap.highHigh||[]).map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>
        <div class="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all">
          <h5 class="text-blue-400 font-bold text-sm mb-3 flex items-center gap-2"><span>👀</span> High Power, Low Interest</h5>
          <ul class="list-disc pl-4 space-y-1 text-sm text-white/90">
            ${(data.stakeholderMap.highLow||[]).map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>
        <div class="bg-brand-green/10 border border-brand-green/20 rounded-xl p-4 hover:shadow-[0_0_15px_rgba(74,222,128,0.15)] transition-all">
          <h5 class="text-brand-green font-bold text-sm mb-3 flex items-center gap-2"><span>🤝</span> Low Power, High Interest</h5>
          <ul class="list-disc pl-4 space-y-1 text-sm text-white/90">
            ${(data.stakeholderMap.lowHigh||[]).map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>
        <div class="bg-gray-500/10 border border-gray-500/20 rounded-xl p-4 hover:shadow-[0_0_15px_rgba(107,114,128,0.15)] transition-all">
          <h5 class="text-gray-400 font-bold text-sm mb-3 flex items-center gap-2"><span>ℹ️</span> Low Power, Low Interest</h5>
          <ul class="list-disc pl-4 space-y-1 text-sm text-white/90">
            ${(data.stakeholderMap.lowLow||[]).map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }
  
  if (data.empathyMap) {
    document.getElementById('ai-out-empathy').innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-xl p-5 hover:-translate-y-1 hover:border-brand-yellow/50 hover:shadow-[0_4px_20px_rgba(247,226,192,0.1)] transition-all duration-300">
          <div class="flex items-center gap-3 mb-4"><div class="w-8 h-8 rounded-full bg-brand-yellow/20 flex items-center justify-center text-brand-yellow">🗣️</div><h5 class="font-bold text-white tracking-wide">SAYS</h5></div>
          <ul class="space-y-2 text-sm text-white/80">
            ${(data.empathyMap.says||[]).map(s => `<li><span class="text-brand-yellow/50 mr-2">"</span>${s}<span class="text-brand-yellow/50 ml-1">"</span></li>`).join('')}
          </ul>
        </div>
        <div class="bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-xl p-5 hover:-translate-y-1 hover:border-blue-400/50 hover:shadow-[0_4px_20px_rgba(96,165,250,0.1)] transition-all duration-300">
          <div class="flex items-center gap-3 mb-4"><div class="w-8 h-8 rounded-full bg-blue-400/20 flex items-center justify-center text-blue-400">💭</div><h5 class="font-bold text-white tracking-wide">THINKS</h5></div>
          <ul class="space-y-2 text-sm text-white/80">
            ${(data.empathyMap.thinks||[]).map(s => `<li><span class="text-blue-400/50 mr-2">•</span>${s}</li>`).join('')}
          </ul>
        </div>
        <div class="bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-xl p-5 hover:-translate-y-1 hover:border-brand-green/50 hover:shadow-[0_4px_20px_rgba(74,222,128,0.1)] transition-all duration-300">
          <div class="flex items-center gap-3 mb-4"><div class="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center text-brand-green">🏃</div><h5 class="font-bold text-white tracking-wide">DOES</h5></div>
          <ul class="space-y-2 text-sm text-white/80">
            ${(data.empathyMap.does||[]).map(s => `<li><span class="text-brand-green/50 mr-2">→</span>${s}</li>`).join('')}
          </ul>
        </div>
        <div class="bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-xl p-5 hover:-translate-y-1 hover:border-red-400/50 hover:shadow-[0_4px_20px_rgba(248,113,113,0.1)] transition-all duration-300">
          <div class="flex items-center gap-3 mb-4"><div class="w-8 h-8 rounded-full bg-red-400/20 flex items-center justify-center text-red-400">❤️</div><h5 class="font-bold text-white tracking-wide">FEELS</h5></div>
          <ul class="space-y-2 text-sm text-white/80">
            ${(data.empathyMap.feels||[]).map(s => `<li><span class="text-red-400/50 mr-2">~</span>${s}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }
  
  if (data.journeyMap) {
    let journeyHtml = '<div class="flex flex-col items-center space-y-2 py-6">';
    data.journeyMap.forEach((step, index) => {
      journeyHtml += `
        <div class="bg-black/50 border border-white/20 rounded-xl px-6 py-3 min-w-[250px] text-center shadow-[0_0_15px_rgba(255,255,255,0.05)] z-10 relative">
          <div class="font-bold text-white text-lg">${step.stage}</div>
          <div class="text-xs text-white/70 mt-1">${step.experience}</div>
        </div>
      `;
      
      if (index < data.journeyMap.length - 1) {
        journeyHtml += `
          <div class="flex flex-col items-center my-1 z-0">
            <div class="text-white/40 text-xl font-bold animate-pulse">↓</div>
          </div>
        `;
      }
    });
    journeyHtml += '</div>';
    
    journeyHtml += `
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6 border-t border-white/10 pt-8">
        ${data.journeyMap.map(step => `
          <div class="bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:bg-white/10 transition-colors">
            <div class="text-xs text-text-muted uppercase tracking-wider mb-3">${step.stage}</div>
            <div class="text-red-400 font-bold text-xs mb-1 flex justify-center items-center gap-1"><span>↓</span> PAIN POINT</div>
            <div class="text-sm text-white/80 mb-4">${step.painPoint}</div>
            <div class="text-brand-green font-bold text-xs mb-1 flex justify-center items-center gap-1"><span>↑</span> OPPORTUNITY</div>
            <div class="text-sm text-white/80">${step.opportunity}</div>
          </div>
        `).join('')}
      </div>
    `;

    document.getElementById('ai-out-journey').innerHTML = journeyHtml;
  }
  
  if (data.communityAssetMap) {
    const assets = [
      { key: 'human', title: 'Human Assets', icon: '👥', color: 'from-blue-500/20 to-transparent border-blue-500/30' },
      { key: 'physical', title: 'Physical Assets', icon: '🏗️', color: 'from-gray-500/20 to-transparent border-gray-500/30' },
      { key: 'natural', title: 'Natural Assets', icon: '🌿', color: 'from-green-500/20 to-transparent border-green-500/30' },
      { key: 'institutional', title: 'Institutional', icon: '🏛️', color: 'from-purple-500/20 to-transparent border-purple-500/30' },
      { key: 'economic', title: 'Economic Assets', icon: '💰', color: 'from-yellow-500/20 to-transparent border-yellow-500/30' }
    ];
    
    document.getElementById('ai-out-assets').innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        ${assets.map(a => `
          <div class="bg-gradient-to-b ${a.color} border rounded-2xl p-4 flex flex-col items-center text-center hover:scale-105 transition-transform duration-300 shadow-lg">
            <div class="text-3xl mb-3">${a.icon}</div>
            <h5 class="font-bold text-white mb-2 text-sm">${a.title}</h5>
            <div class="text-xs text-white/80 space-y-1 w-full border-t border-white/10 pt-2 mt-1">
              ${(data.communityAssetMap[a.key]||[]).map(item => `<div class="truncate" title="${item}">${item}</div>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  if (data.problemTree) {
    document.getElementById('ai-out-problem').innerHTML = `
      <div class="flex flex-col items-center py-6">
        
        <!-- Effects (Top Branches) -->
        <div class="flex flex-wrap justify-center gap-3 w-full px-2">
          ${(data.problemTree.effects||[]).map(e => `
            <div class="bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-2 rounded-lg text-sm text-center shadow-[0_0_10px_rgba(239,68,68,0.1)] hover:-translate-y-1 transition-transform">
              ${e}
            </div>
          `).join('')}
        </div>
        
        <!-- Up Arrows -->
        <div class="flex justify-center gap-8 my-3 w-full text-red-400/50 text-xl animate-pulse">
          ${(data.problemTree.effects||[]).slice(0,3).map(() => `<div>↑</div>`).join('')}
        </div>

        <!-- Main Problem (Trunk) -->
        <div class="bg-red-600 border border-red-400 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.4)] z-10 my-2 text-center max-w-md w-full">
          ${data.problemTree.mainProblem}
        </div>
        
        <!-- Down Arrows -->
        <div class="flex justify-center gap-8 my-3 w-full text-brand-yellow/50 text-xl animate-pulse">
          ${(data.problemTree.causes||[]).slice(0,3).map(() => `<div>↓</div>`).join('')}
        </div>

        <!-- Causes (Roots) -->
        <div class="flex flex-wrap justify-center gap-3 w-full px-2">
          ${(data.problemTree.causes||[]).map(c => `
            <div class="bg-brand-yellow/10 border border-brand-yellow/30 text-brand-yellow px-4 py-2 rounded-lg text-sm text-center shadow-[0_0_10px_rgba(247,226,192,0.1)] hover:translate-y-1 transition-transform">
              ${c}
            </div>
          `).join('')}
        </div>

      </div>
    `;
  }
  
  if (data.sdgMapping) {
    document.getElementById('ai-out-sdg').innerHTML = data.sdgMapping.map(sdg => `
      <div class="bg-black/30 p-3 rounded-xl border border-white/5 text-center flex flex-col justify-center h-24">
        <div class="text-xl font-bold text-white mb-1">${sdg.score}%</div>
        <div class="text-xs text-brand-yellow font-bold uppercase">${sdg.sdg}</div>
      </div>
    `).join('');
  }
  
  if (data.implementationRoadmap) {
    document.getElementById('ai-out-project').innerHTML = `
      <div class="relative pl-6 sm:pl-8 py-4">
        <!-- Vertical Timeline Line -->
        <div class="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-brand-yellow via-brand-yellow/50 to-transparent ml-[7px]"></div>
        
        <div class="space-y-6">
          ${data.implementationRoadmap.map((r, i) => `
            <div class="relative group">
              <!-- Timeline Dot -->
              <div class="absolute -left-[30px] sm:-left-[38px] top-1.5 w-4 h-4 rounded-full bg-brand-yellow shadow-[0_0_10px_rgba(247,226,192,0.8)] group-hover:scale-125 transition-transform duration-300"></div>
              
              <!-- Card -->
              <div class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors ml-4 sm:ml-0 shadow-lg">
                <span class="inline-block px-3 py-1 bg-brand-yellow/20 text-brand-yellow text-xs font-bold rounded-full mb-2 uppercase tracking-wide">${r.month}</span>
                <p class="text-white text-sm leading-relaxed">${r.activity}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}
