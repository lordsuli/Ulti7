// ==================== Firebase Init ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 🔑 Config
const firebaseConfig = {
  apiKey: "AIzaSyAf6X1zhZtphhZb9voLUW_lIUWII1BA8fg",
  authDomain: "ulti-emele.firebaseapp.com",
  projectId: "ulti-emele",
  storageBucket: "ulti-emele.appspot.com",
  messagingSenderId: "138249987485",
  appId: "1:138249987485:web:7d7b3719a9004746907b74",
  measurementId: "G-PVWJD6K24K"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ==================== DOM Ready ====================
document.addEventListener("DOMContentLoaded", () => {

  // Auth Observer
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location = "auth.html";
    } else {
      document.body.style.display="block";

      // رسالة الترحيب
      let name = user.displayName ? user.displayName : (user.email ? user.email.split("@")[0] : "Guest");
      document.getElementById("welcomeUser").textContent = `Welcome, Dr. ${name} 👋`;
      document.getElementById("profileBtn").textContent = name[0].toUpperCase();
    }
  });

  // Logout Function
  window.logout = function() {
    signOut(auth).then(() => window.location = "auth.html");
  }

  // Dropdown menus
  const profileBtn = document.getElementById("profileBtn");
  const notifyBtn = document.getElementById("notifyBtn");
  const profileMenu = document.getElementById("dropdownMenu");
  const notifMenu = document.getElementById("notificationsMenu");

  profileBtn.addEventListener("click", () => {
    profileMenu.style.display = (profileMenu.style.display === "flex" ? "none" : "flex");
    notifMenu.style.display = "none";
  });

  notifyBtn.addEventListener("click", () => {
    notifMenu.style.display = (notifMenu.style.display === "flex" ? "none" : "flex");
    profileMenu.style.display = "none";
  });

  // Notifications Modal
  window.openNotificationModal = function(title, message) {
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalMessage").textContent = message;
    document.getElementById("notificationModal").style.display = "flex";
    notifMenu.style.display = "none";
  }

  window.closeNotificationModal = function() {
    document.getElementById("notificationModal").style.display = "none";
  }
});