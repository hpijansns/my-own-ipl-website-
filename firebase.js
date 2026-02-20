import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
  getDatabase, 
  ref, 
  onValue, 
  get, 
  push, 
  set, 
  update, 
  remove, 
  query, 
  orderByChild, 
  equalTo 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAm5CDmBfpSL4tqbJLqUm1N4iqHyUCsZ6Y",
  authDomain: "ticketarena-ipl.firebaseapp.com",
  databaseURL: "https://ticketarena-ipl-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ticketarena-ipl",
  storageBucket: "ticketarena-ipl.firebasestorage.app",
  messagingSenderId: "460721412352",
  appId: "1:460721412352:web:594c1fc55d4db48bdf3be5"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, onValue, get, push, set, update, remove, query, orderByChild, equalTo };
