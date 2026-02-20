import { db, ref, onValue, get, push, set, query, orderByChild, equalTo } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('matches-container')) initHome();
  if (document.getElementById('booking-form')) initBooking();
  if (document.getElementById('checkout-form')) initCheckout();
});

// --- HOME PAGE ---
function initHome() {
  const container = document.getElementById('matches-container');
  
  onValue(ref(db, 'matches'), (snapshot) => {
    container.innerHTML = '';
    const data = snapshot.val();
    let hasMatches = false;

    if (data) {
      Object.keys(data).forEach(matchId => {
        const match = data;
        if (match.active) {
          hasMatches = true;
          const card = document.createElement('div');
          card.className = 'card match-card';
          card.innerHTML = `
            <h3>${match.teamA} vs ${match.teamB}</h3>
            <p><strong>Date:</strong> ${new Date(match.date).toLocaleString()}</p>
            <p><strong>Stadium:</strong> ${match.stadium}</p>
            <div class="price-tags">
              <span class="price-tag">General: ₹${match.generalPrice}</span>
              <span class="price-tag">Premium: ₹${match.premiumPrice}</span>
              <span class="price-tag">VIP: ₹${match.vipPrice}</span>
            </div>
            <button class="btn" style="width: 100%; margin-top: 1rem;" onclick="location.href='booking.html?id=${matchId}'">Book Now</button>
          `;
          container.appendChild(card);
        }
      });
    }

    if (!hasMatches) {
      container.innerHTML = '<p class="text-secondary">No active matches available at the moment.</p>';
    }
  });
}

// --- BOOKING PAGE ---
async function initBooking() {
  const urlParams = new URLSearchParams(window.location.search);
  const matchId = urlParams.get('id');

  if (!matchId) {
    window.location.href = 'index.html';
    return;
  }

  const matchRef = ref(db, 'matches/' + matchId);
  const snapshot = await get(matchRef);
  
  if (!snapshot.exists() || !snapshot.val().active) {
    alert('Match not found or inactive.');
    window.location.href = 'index.html';
    return;
  }

  const match = snapshot.val();
  document.getElementById('match-title').innerText = `${match.teamA} vs ${match.teamB}`;
  document.getElementById('match-details').innerText = `${new Date(match.date).toLocaleString()} | ${match.stadium}`;

  const seatSelect = document.getElementById('seat-type');
  seatSelect.innerHTML = `
    <option value="" disabled selected>-- Select Seat Category --</option>
    <option value="General" data-price="${match.generalPrice}">General Stand - ₹${match.generalPrice}</option>
    <option value="Premium" data-price="${match.premiumPrice}">Premium Lounge - ₹${match.premiumPrice}</option>
    <option value="VIP" data-price="${match.vipPrice}">VIP Box - ₹${match.vipPrice}</option>
  `;

  seatSelect.addEventListener('change', (e) => {
    const price = e.target.options.getAttribute('data-price');
    document.getElementById('price-display').innerText = price;
  });

  document.getElementById('booking-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!seatSelect.value) {
      alert("Please select a seat type.");
      return;
    }
    const price = seatSelect.options.getAttribute('data-price');
    
    const bookingData = {
      matchId: matchId,
      matchName: `${match.teamA} vs ${match.teamB}`,
      seatType: seatSelect.value,
      price: price
    };
    
    localStorage.setItem('ta_booking', JSON.stringify(bookingData));
    window.location.href = 'checkout.html';
  });
}

// --- CHECKOUT PAGE ---
function initCheckout() {
  const bookingDataStr = localStorage.getItem('ta_booking');
  if (!bookingDataStr) {
    window.location.href = 'index.html';
    return;
  }

  const bookingData = JSON.parse(bookingDataStr);
  
  document.getElementById('summary-match').innerText = bookingData.matchName;
  document.getElementById('summary-seat').innerText = bookingData.seatType;
  document.getElementById('summary-price').innerText = bookingData.price;

  // Fetch Payment Settings
  onValue(ref(db, 'settings/payment'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
      document.getElementById('upi-display').innerText = data.upiId || 'Not set';
      if (data.qrImageUrl) {
        document.getElementById('qr-image').src = data.qrImageUrl;
        document.getElementById('qr-image').style.display = 'inline-block';
        document.getElementById('qr-placeholder').style.display = 'none';
      }
    }
  });

  // Handle Form Submit
  document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.innerText = 'Processing...';

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const mobile = document.getElementById('mobile').value.trim();
    const utr = document.getElementById('utr').value.trim();

    try {
      // Check Duplicate UTR
      const utrQuery = query(ref(db, 'bookings'), orderByChild('utr'), equalTo(utr));
      const utrSnap = await get(utrQuery);
      
      if (utrSnap.exists()) {
        alert('This UTR number has already been used. Please verify your details.');
        btn.disabled = false;
        btn.innerText = 'Complete Booking';
        return;
      }

      // Push Booking
      const newBookingRef = push(ref(db, 'bookings'));
      await set(newBookingRef, {
        name,
        email,
        mobile,
        matchId: bookingData.matchId,
        matchName: bookingData.matchName,
        seatType: bookingData.seatType,
        price: bookingData.price,
        utr,
        status: "Pending",
        createdAt: new Date().toISOString()
      });

      localStorage.removeItem('ta_booking');
      window.location.href = 'thankyou.html';

    } catch (error) {
      console.error(error);
      alert('An error occurred. Please try again.');
      btn.disabled = false;
      btn.innerText = 'Complete Booking';
    }
  });
          }
