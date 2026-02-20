import { db, ref, onValue, set, update, remove, push } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('ta_admin_auth') === 'true') {
    showDashboard();
  } else {
    document.getElementById('admin-login').style.display = 'flex';
  }
});

window.loginAdmin = function(e) {
  e.preventDefault();
  const pass = document.getElementById('admin-pass').value;
  if (pass === 'admin123') {
    sessionStorage.setItem('ta_admin_auth', 'true');
    showDashboard();
  } else {
    alert('Invalid Credentials');
  }
};

window.logoutAdmin = function() {
  sessionStorage.removeItem('ta_admin_auth');
  location.reload();
};

function showDashboard() {
  document.getElementById('admin-login').style.display = 'none';
  document.getElementById('admin-dashboard').style.display = 'block';
  initAdminTabs();
  initMatchesManager();
  initBookingsManager();
  initSettingsManager();
}

window.switchTab = function(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  document.querySelector(`button`).classList.add('active');
  document.getElementById(tabId).classList.add('active');
};

function initAdminTabs() {
  // Setup initial state if needed
}

// --- MATCHES MANAGER ---
function initMatchesManager() {
  const matchesTbody = document.getElementById('matches-tbody');
  
  onValue(ref(db, 'matches'), (snapshot) => {
    matchesTbody.innerHTML = '';
    const data = snapshot.val();
    if (data) {
      Object.keys(data).forEach(id => {
        const m = data;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${m.teamA} vs ${m.teamB}</td>
          <td>${new Date(m.date).toLocaleString()}</td>
          <td>${m.stadium}</td>
          <td>₹${m.generalPrice} / ₹${m.premiumPrice} / ₹${m.vipPrice}</td>
          <td>
            <span class="status-badge ${m.active ? 'status-Approved' : 'status-Rejected'}">
              ${m.active ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="toggleMatch('${id}', ${m.active})">${m.active ? 'Deactivate' : 'Activate'}</button>
            <button class="btn btn-sm btn-secondary" onclick="editMatch('${id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteMatch('${id}')">Delete</button>
          </td>
        `;
        matchesTbody.appendChild(tr);
      });
    } else {
      matchesTbody.innerHTML = '<tr><td colspan="6" class="text-center">No matches found.</td></tr>';
    }
  });

  document.getElementById('match-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('m-id').value;
    const matchData = {
      teamA: document.getElementById('m-teamA').value,
      teamB: document.getElementById('m-teamB').value,
      date: document.getElementById('m-date').value,
      stadium: document.getElementById('m-stadium').value,
      generalPrice: document.getElementById('m-gen').value,
      premiumPrice: document.getElementById('m-prem').value,
      vipPrice: document.getElementById('m-vip').value,
      active: document.getElementById('m-active').value === 'true'
    };

    if (id) {
      await update(ref(db, 'matches/' + id), matchData);
    } else {
      await set(push(ref(db, 'matches')), matchData);
    }
    
    document.getElementById('match-form').reset();
    document.getElementById('m-id').value = '';
    document.getElementById('match-submit-btn').innerText = 'Add Match';
  });
}

window.editMatch = async function(id) {
  const snapshot = await get(ref(db, 'matches/' + id));
  if (snapshot.exists()) {
    const m = snapshot.val();
    document.getElementById('m-id').value = id;
    document.getElementById('m-teamA').value = m.teamA;
    document.getElementById('m-teamB').value = m.teamB;
    document.getElementById('m-date').value = m.date;
    document.getElementById('m-stadium').value = m.stadium;
    document.getElementById('m-gen').value = m.generalPrice;
    document.getElementById('m-prem').value = m.premiumPrice;
    document.getElementById('m-vip').value = m.vipPrice;
    document.getElementById('m-active').value = m.active ? 'true' : 'false';
    document.getElementById('match-submit-btn').innerText = 'Update Match';
    window.scrollTo(0, 0);
  }
};

window.toggleMatch = async function(id, currentStatus) {
  await update(ref(db, 'matches/' + id), { active: !currentStatus });
};

window.deleteMatch = async function(id) {
  if (confirm('Are you sure you want to delete this match?')) {
    await remove(ref(db, 'matches/' + id));
  }
};

// --- BOOKINGS MANAGER ---
function initBookingsManager() {
  const bookingsTbody = document.getElementById('bookings-tbody');
  
  onValue(ref(db, 'bookings'), (snapshot) => {
    bookingsTbody.innerHTML = '';
    const data = snapshot.val();
    if (data) {
      // Sort by date descending
      const bookingsArray = Object.keys(data).map(key => ({ id: key, ...data }));
      bookingsArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      bookingsArray.forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${new Date(b.createdAt).toLocaleString()}</td>
          <td>${b.name}<br><small class="text-secondary">${b.mobile}</small></td>
          <td>${b.matchName}<br><small class="text-accent">${b.seatType}</small></td>
          <td>₹${b.price}</td>
          <td><strong>${b.utr}</strong></td>
          <td><span class="status-badge status-${b.status}">${b.status}</span></td>
          <td>
            ${b.status === 'Pending' ? `
              <button class="btn btn-sm btn-success" onclick="updateBooking('${b.id}', 'Approved')">Approve</button>
              <button class="btn btn-sm btn-danger" onclick="updateBooking('${b.id}', 'Rejected')">Reject</button>
            ` : ''}
            <button class="btn btn-sm btn-secondary" onclick="deleteBooking('${b.id}')">Delete</button>
          </td>
        `;
        bookingsTbody.appendChild(tr);
      });
    } else {
      bookingsTbody.innerHTML = '<tr><td colspan="7" class="text-center">No bookings found.</td></tr>';
    }
  });
}

window.updateBooking = async function(id, status) {
  if (confirm(`Mark this booking as ${status}?`)) {
    await update(ref(db, 'bookings/' + id), { status: status });
  }
};

window.deleteBooking = async function(id) {
  if (confirm('Delete this booking permanently?')) {
    await remove(ref(db, 'bookings/' + id));
  }
};

// --- SETTINGS MANAGER ---
function initSettingsManager() {
  const upiInput = document.getElementById('s-upi');
  const qrInput = document.getElementById('s-qr');

  onValue(ref(db, 'settings/payment'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
      upiInput.value = data.upiId || '';
      qrInput.value = data.qrImageUrl || '';
    }
  });

  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await set(ref(db, 'settings/payment'), {
      upiId: upiInput.value.trim(),
      qrImageUrl: qrInput.value.trim()
    });
    alert('Payment settings updated successfully.');
  });
}
