import { db, ref, onValue, get, set, push, update, remove } from './firebase.js';

// Global Toast System for Admin
window.showToast = function(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('ta_admin_auth') === 'true') {
    initDashboard();
  } else {
    document.getElementById('admin-login').style.display = 'flex';
  }
});

window.loginAdmin = function(e) {
  e.preventDefault();
  const pass = document.getElementById('admin-pass').value;
  if (pass === 'admin123') {
    sessionStorage.setItem('ta_admin_auth', 'true');
    initDashboard();
  } else {
    showToast('Invalid credentials', 'error');
  }
};

window.logoutAdmin = function() {
  sessionStorage.removeItem('ta_admin_auth');
  window.location.reload();
};

function initDashboard() {
  document.getElementById('admin-login').style.display = 'none';
  document.getElementById('admin-dashboard').style.display = 'flex';
  
  initMatches();
  initBookings();
  initSettings();
}

window.switchTab = function(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector(``).classList.add('active');
  document.getElementById(tabId).classList.add('active');
};

// --- MATCHES ---
function initMatches() {
  const tbody = document.getElementById('matches-tbody');
  
  onValue(ref(db, 'matches'), (snapshot) => {
    tbody.innerHTML = '';
    const data = snapshot.val();
    if (data) {
      Object.entries(data).reverse().forEach(() => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${m.teamA} vs ${m.teamB}</strong></td>
          <td>${new Date(m.date).toLocaleString()}</td>
          <td>${m.stadium}</td>
          <td>₹${m.generalPrice} / ₹${m.premiumPrice} / ₹${m.vipPrice}</td>
          <td><span class="status-badge ${m.active ? 'status-Approved' : 'status-Rejected'}">${m.active ? 'Active' : 'Inactive'}</span></td>
          <td style="display: flex; gap: 0.5rem;">
            <button class="btn btn-sm ${m.active ? 'btn-danger' : 'btn-success'}" onclick="window.toggleMatch('${id}', ${m.active})">
              ${m.active ? 'Disable' : 'Enable'}
            </button>
            <button class="btn btn-sm btn-secondary" onclick="window.editMatch('${id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="window.deleteMatch('${id}')">Del</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No matches found.</td></tr>';
    }
  });

  document.getElementById('match-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('match-submit-btn');
    btn.disabled = true;

    const id = document.getElementById('m-id').value;
    const payload = {
      teamA: document.getElementById('m-teamA').value.trim(),
      teamB: document.getElementById('m-teamB').value.trim(),
      date: document.getElementById('m-date').value,
      stadium: document.getElementById('m-stadium').value.trim(),
      generalPrice: parseInt(document.getElementById('m-gen').value),
      premiumPrice: parseInt(document.getElementById('m-prem').value),
      vipPrice: parseInt(document.getElementById('m-vip').value),
      active: document.getElementById('m-active').value === 'true'
    };

    try {
      if (id) await update(ref(db, `matches/${id}`), payload);
      else await set(push(ref(db, 'matches')), payload);
      
      showToast('Match saved successfully!');
      document.getElementById('match-form').reset();
      document.getElementById('m-id').value = '';
      btn.textContent = 'Add Match';
    } catch (err) {
      showToast('Error saving match', 'error');
    }
    btn.disabled = false;
  });
}

window.editMatch = async function(id) {
  const snap = await get(ref(db, `matches/${id}`));
  if (snap.exists()) {
    const m = snap.val();
    document.getElementById('m-id').value = id;
    document.getElementById('m-teamA').value = m.teamA;
    document.getElementById('m-teamB').value = m.teamB;
    document.getElementById('m-date').value = m.date;
    document.getElementById('m-stadium').value = m.stadium;
    document.getElementById('m-gen').value = m.generalPrice;
    document.getElementById('m-prem').value = m.premiumPrice;
    document.getElementById('m-vip').value = m.vipPrice;
    document.getElementById('m-active').value = m.active ? 'true' : 'false';
    document.getElementById('match-submit-btn').textContent = 'Update Match';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

window.toggleMatch = async function(id, current) {
  await update(ref(db, `matches/${id}`), { active: !current });
  showToast('Match status updated.');
};

window.deleteMatch = async function(id) {
  if (confirm('Permanently delete this match?')) {
    await remove(ref(db, `matches/${id}`));
    showToast('Match deleted.');
  }
};

// --- BOOKINGS ---
function initBookings() {
  const tbody = document.getElementById('bookings-tbody');
  
  onValue(ref(db, 'bookings'), (snapshot) => {
    tbody.innerHTML = '';
    const data = snapshot.val();
    if (data) {
      const arr = Object.entries(data).map(() => ({ id, ...val }));
      arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      arr.forEach(b => {
        const dateStr = b.createdAt ? new Date(b.createdAt).toLocaleString() : 'N/A';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><span class="text-muted" style="font-size:0.85rem">${dateStr}</span></td>
          <td><strong>${b.name}</strong><br><span class="text-muted">${b.email}<br>${b.mobile}</span></td>
          <td>${b.matchName}<br><span class="tag tag-accent mt-1" style="display:inline-block">${b.seatType}</span></td>
          <td>₹${b.price}</td>
          <td><code style="background:rgba(0,0,0,0.3);padding:0.2rem 0.5rem;border-radius:4px">${b.utr}</code></td>
          <td><span class="status-badge status-${b.status}">${b.status}</span></td>
          <td style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            ${b.status === 'Pending' ? `
              <button class="btn btn-sm btn-success" onclick="window.updateBookingStatus('${b.id}', 'Approved')">✔ Appr</button>
              <button class="btn btn-sm btn-danger" onclick="window.updateBookingStatus('${b.id}', 'Rejected')">✖ Rej</button>
            ` : ''}
            <button class="btn btn-sm btn-secondary" onclick="window.deleteBooking('${b.id}')">Del</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No bookings found.</td></tr>';
    }
  });
}

window.updateBookingStatus = async function(id, status) {
  if (confirm(`Mark this booking as ${status}?`)) {
    await update(ref(db, `bookings/${id}`), { status });
    showToast(`Booking ${status}`);
  }
};

window.deleteBooking = async function(id) {
  if (confirm('Delete this booking permanently?')) {
    await remove(ref(db, `bookings/${id}`));
    showToast('Booking deleted.');
  }
};

// --- SETTINGS ---
function initSettings() {
  const form = document.getElementById('settings-form');
  const upiInput = document.getElementById('s-upi');
  const qrInput = document.getElementById('s-qr');

  onValue(ref(db, 'settings/payment'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
      upiInput.value = data.upiId || '';
      qrInput.value = data.qrImageUrl || '';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;
    try {
      await set(ref(db, 'settings/payment'), {
        upiId: upiInput.value.trim(),
        qrImageUrl: qrInput.value.trim()
      });
      showToast('Payment settings updated!');
    } catch (err) {
      showToast('Failed to update settings.', 'error');
    }
    btn.disabled = false;
  });
  }
