import { db, ref, onValue, get, push, set, query, orderByChild, equalTo, serverTimestamp } from './firebase.js';

// Global Toast System
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

// Router
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  if (path.endsWith('/') || path.endsWith('index.html')) initHome();
  else if (path.endsWith('booking.html')) initBooking();
  else if (path.endsWith('checkout.html')) initCheckout();
});

// --- HOME ---
function initHome() {
  const container = document.getElementById('matches-grid');
  if (!container) return;

  container.innerHTML = '<div class="loader"></div>';

  onValue(ref(db, 'matches'), (snapshot) => {
    container.innerHTML = '';
    const data = snapshot.val();
    let hasActive = false;

    if (data) {
      Object.entries(data).forEach(() => {
        if (match.active) {
          hasActive = true;
          const card = document.createElement('div');
          card.className = 'card card-hover match-card';
          card.innerHTML = `
            <h3>${match.teamA} vs ${match.teamB}</h3>
            <p class="details">
              📅 ${new Date(match.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}<br>
              🏟️ ${match.stadium}
            </p>
            <div class="price-tags">
              <span class="tag">Gen: ₹${match.generalPrice}</span>
              <span class="tag tag-accent">Prem: ₹${match.premiumPrice}</span>
              <span class="tag">VIP: ₹${match.vipPrice}</span>
            </div>
            <button class="btn w-100 mt-2" onclick="window.bookMatch('${matchId}')">Book Tickets</button>
          `;
          container.appendChild(card);
        }
      });
    }

    if (!hasActive) {
      container.innerHTML = '<div class="card"><p class="text-center text-muted">No active matches available right now. Check back later!</p></div>';
    }
  });

  window.bookMatch = function(matchId) {
    localStorage.setItem('ta_selectedMatch', matchId);
    window.location.href = 'booking.html';
  };
}

// --- BOOKING ---
async function initBooking() {
  const matchId = localStorage.getItem('ta_selectedMatch');
  if (!matchId) return window.location.replace('index.html');

  const titleEl = document.getElementById('match-title');
  const detailsEl = document.getElementById('match-details');
  const selectEl = document.getElementById('seat-type');
  const priceEl = document.getElementById('price-display');
  const form = document.getElementById('booking-form');

  try {
    const snapshot = await get(ref(db, `matches/${matchId}`));
    if (!snapshot.exists() || !snapshot.val().active) throw new Error('Match unavailable');
    
    const match = snapshot.val();
    window.currentMatchData = { id: matchId, name: `${match.teamA} vs ${match.teamB}` };

    titleEl.textContent = window.currentMatchData.name;
    detailsEl.textContent = `${new Date(match.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} | ${match.stadium}`;

    selectEl.innerHTML = `
      <option value="" disabled selected>-- Choose Category --</option>
      <option value="General" data-price="${match.generalPrice}">General Stand - ₹${match.generalPrice}</option>
      <option value="Premium" data-price="${match.premiumPrice}">Premium Lounge - ₹${match.premiumPrice}</option>
      <option value="VIP" data-price="${match.vipPrice}">VIP Box - ₹${match.vipPrice}</option>
    `;

    selectEl.addEventListener('change', (e) => {
      const price = e.target.options.dataset.price;
      priceEl.textContent = price;
    });

  } catch (error) {
    showToast('Match not found or is no longer active.', 'error');
    setTimeout(() => window.location.replace('index.html'), 2000);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!selectEl.value) return showToast('Please select a seat category.', 'error');

    const price = selectEl.options.dataset.price;
    const bookingData = {
      matchId: window.currentMatchData.id,
      matchName: window.currentMatchData.name,
      seatType: selectEl.value,
      price: parseInt(price)
    };

    sessionStorage.setItem('ta_checkoutData', JSON.stringify(bookingData));
    window.location.href = 'checkout.html';
  });
}

// --- CHECKOUT ---
function initCheckout() {
  const dataStr = sessionStorage.getItem('ta_checkoutData');
  if (!dataStr) return window.location.replace('index.html');

  const checkoutData = JSON.parse(dataStr);
  
  document.getElementById('summary-match').textContent = checkoutData.matchName;
  document.getElementById('summary-seat').textContent = checkoutData.seatType;
  document.getElementById('summary-price').textContent = checkoutData.price;

  const qrImg = document.getElementById('qr-image');
  const upiText = document.getElementById('upi-display');

  // Fetch Payment Settings
  onValue(ref(db, 'settings/payment'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
      upiText.textContent = data.upiId || 'Not configured';
      if (data.qrImageUrl) {
        qrImg.src = data.qrImageUrl;
        qrImg.style.display = 'block';
      }
    }
  });

  const form = document.getElementById('checkout-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying...';

    const utr = document.getElementById('utr').value.trim();
    
    try {
      // Prevent duplicate UTR
      const utrQuery = query(ref(db, 'bookings'), orderByChild('utr'), equalTo(utr));
      const utrSnap = await get(utrQuery);

      if (utrSnap.exists()) {
        showToast('This UTR number has already been registered.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm Booking';
        return;
      }

      const bookingPayload = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        mobile: document.getElementById('mobile').value.trim(),
        matchId: checkoutData.matchId,
        matchName: checkoutData.matchName,
        seatType: checkoutData.seatType,
        price: checkoutData.price,
        utr: utr,
        status: "Pending",
        createdAt: serverTimestamp()
      };

      const newBookingRef = push(ref(db, 'bookings'));
      await set(newBookingRef, bookingPayload);

      sessionStorage.removeItem('ta_checkoutData');
      localStorage.removeItem('ta_selectedMatch');
      window.location.replace('thankyou.html');

    } catch (error) {
      console.error(error);
      showToast('Transaction failed. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm Booking';
    }
  });
                                        }
