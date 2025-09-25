// ==================== Firebase Init ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔑 Config بتاع مشروعك
const firebaseConfig = {
  apiKey: "AIzaSyAf6X1zhZtphhZb9voLUW_lIUWII1BA8fg",
  authDomain: "ulti-emele.firebaseapp.com",
  projectId: "ulti-emele",
  storageBucket: "ulti-emele.firebasestorage.app",
  messagingSenderId: "138249987485",
  appId: "1:138249987485:web:7d7b3719a9004746907b74",
  measurementId: "G-PVWJD6K24K"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ========================================================

let currentQ = 0, questions = [], systemName = "";

const params = new URLSearchParams(window.location.search);
systemName = params.get("system") || "cardio";
document.getElementById("systemTitle").textContent =
  systemName.charAt(0).toUpperCase() + systemName.slice(1);

// ✅ تحقق من المستخدم
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location = "auth.html";
  } else {
    document.body.style.display = "flex";

    // حاول تجيب الأسئلة من Firestore
    const qsSnap = await getDocs(collection(db, "questions-" + systemName));
    if (!qsSnap.empty) {
      questions = qsSnap.docs.map(doc => doc.data());
    } else {
      // لو مش موجودة fallback للـ JSON
      const r = await fetch(`questions/${systemName}.json`);
      questions = await r.json();
    }

    // تحميل التقدّم
    await loadProgress(user.uid);
    renderNavigator();
    updateProgressBar();
  }
});

// ==================== Core Logic ====================

// Load Question
function loadQuestion() {
  if (!questions.length) return;
  const q = questions[currentQ];
  document.getElementById("questionContainer").innerHTML = `
    <div class="question-box">
      <div class="top-icons">
        <button class="bookmark" onclick="toggleBookmark('${q.CaseID}')"></button>
        <button class="btn-glass" onclick="resetSystem()">Reset</button>
      </div>
      <p>${q.case}</p>
      <div class="options">
        ${q.options.map((opt,i)=>`<button id="opt${i}" onclick="checkAnswer(this,'${opt}')">${opt}</button>`).join("")}
      </div>
      <div id="explanationBox"></div>
    </div>`;

  const state = JSON.parse(localStorage.getItem(`${systemName}_state`) || "{}")[q.CaseID];
  if (state) restoreState(q, state);

  const bms = JSON.parse(localStorage.getItem(`${systemName}_bookmarks`) || "[]");
  if (bms.includes(q.CaseID)) document.querySelector(".bookmark").classList.add("active");

  renderNavigator(); updateProgressBar();
}

// Check Answer
async function checkAnswer(btn, sel) {
  const q = questions[currentQ], correct = q.correctAnswer;
  const opts = btn.parentNode.querySelectorAll("button");
  let isCorrect = false;

  opts.forEach(o => {
    o.disabled = true;
    if (o.textContent === correct) {
      o.classList.add("correct");
      if (o === btn) isCorrect = true;
    } else if (o.textContent === sel && sel !== correct) {
      o.classList.add("wrong");
    }
  });

  let exp = `<p><strong>Correct:</strong> ${q.explanation.correct}</p>`;
  if (Array.isArray(q.explanation.incorrect)) {
    exp += "<ul>";
    q.explanation.incorrect.forEach(e => exp += `<li><b>${e.option}:</b> ${e.reason}</li>`);
    exp += "</ul>";
  }
  document.getElementById("explanationBox").innerHTML =
    `<div class="explanation">${exp}<button class="btn-glass" onclick="nextQuestion()">Next →</button></div>`;

  markAnswered(q.CaseID);
  saveProgress();
  saveState(q, opts, document.getElementById("explanationBox").innerHTML, isCorrect);
  renderNavigator(); updateProgressBar();

  // سجل النتيجة في Firestore
  const user = auth.currentUser;
  if (user) {
    await setDoc(doc(db, "users", user.uid, "systems", systemName), {
      lastAnswered: new Date(),
      currentProgress: currentQ
    }, { merge: true });
  }
}

// Save/restore state
function saveState(q, opts, expl, isCorrect) {
  let s = JSON.parse(localStorage.getItem(`${systemName}_state`) || "{}");
  s[q.CaseID] = {
    options: [...opts].map(o => o.className),
    explained: expl,
    isCorrect: isCorrect
  };
  localStorage.setItem(`${systemName}_state`, JSON.stringify(s));
}

function restoreState(q, s) {
  q.options.forEach((opt, i) => {
    const btn = document.getElementById("opt" + i);
    btn.className = s.options[i];
    if (btn.className.includes("correct") || btn.className.includes("wrong")) btn.disabled = true;
  });
  document.getElementById("explanationBox").innerHTML = s.explained;
}

// Next Question
function nextQuestion() {
  if (currentQ < questions.length - 1) {
    currentQ++; loadQuestion(); saveProgress();
  } else alert("🎉 End of questions!");
}

// Navigator
function renderNavigator() {
  const nav = document.getElementById("navigator");
  const ans = JSON.parse(localStorage.getItem(`${systemName}_answered`) || "[]");
  const bms = JSON.parse(localStorage.getItem(`${systemName}_bookmarks`) || "[]");
  nav.innerHTML = questions.map((q, i) => {
    let cls = "";
    if (ans.includes(q.CaseID)) cls = "answered";
    if (i === currentQ) cls = "current";
    if (bms.includes(q.CaseID)) cls = "bookmarked"; // priority
    return `<button class="${cls}" onclick="goToQuestion(${i})">${i+1}</button>`;
  }).join("");
}
function toggleNavigator() {
  document.getElementById("navigator").classList.toggle("show");
}
function goToQuestion(i) {
  currentQ = i; loadQuestion(); saveProgress();
}

// Bookmark
async function toggleBookmark(id) {
  let bms = JSON.parse(localStorage.getItem(`${systemName}_bookmarks`) || "[]");
  if (bms.includes(id)) {
    bms = bms.filter(x => x !== id);
    document.querySelector(".bookmark").classList.remove("active");
  } else {
    bms.push(id);
    document.querySelector(".bookmark").classList.add("active");
    showToast("Question has been Bookmarked");
  }
  localStorage.setItem(`${systemName}_bookmarks`, JSON.stringify(bms));
  renderNavigator();

  // ✅ حفظ في Firestore كمان
  const user = auth.currentUser;
  if (user) {
    await setDoc(doc(db, "users", user.uid, "systems", systemName), {
      bookmarks: bms
    }, { merge: true });
  }
}

// Toast
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2000);
}

// Mark Answered
function markAnswered(id) {
  let a = JSON.parse(localStorage.getItem(`${systemName}_answered`) || "[]");
  if (!a.includes(id)) a.push(id);
  localStorage.setItem(`${systemName}_answered`, JSON.stringify(a));
}

// Progress
function updateProgressBar() {
  const a = JSON.parse(localStorage.getItem(`${systemName}_answered`) || "[]");
  let per = Math.round((a.length / questions.length) * 100);
  document.getElementById("progressText").textContent = `Progress ${per}%`;
  document.getElementById("progressFill").style.width = `${per}%`;
}

// Reset
function resetSystem() {
  document.getElementById("resetModal").classList.remove("hidden");
}
function closeReset() {
  document.getElementById("resetModal").classList.add("hidden");
}
function confirmReset() {
  currentQ = 0;
  localStorage.removeItem(`${systemName}_progress`);
  localStorage.removeItem(`${systemName}_bookmarks`);
  localStorage.removeItem(`${systemName}_answered`);
  localStorage.removeItem(`${systemName}_state`);
  closeReset(); loadQuestion(); renderNavigator(); updateProgressBar();
}

// Save/Load progress
function saveProgress() {
  localStorage.setItem(`${systemName}_progress`, currentQ);
  const user = auth.currentUser;
  if (user) {
    setDoc(doc(db, "users", user.uid, "systems", systemName), {
      currentProgress: currentQ
    }, { merge: true });
  }
}

async function loadProgress(userId) {
  const s = localStorage.getItem(`${systemName}_progress`);
  currentQ = (s !== null) ? parseInt(s) : 0;

  try {
    const snap = await getDoc(doc(db, "users", userId, "systems", systemName));
    if (snap.exists()) {
      const data = snap.data();
      if (data.currentProgress !== undefined) {
        currentQ = data.currentProgress;
      }
      if (data.bookmarks !== undefined) {
        localStorage.setItem(`${systemName}_bookmarks`, JSON.stringify(data.bookmarks));
      }
    }
  } catch (e) { console.error(e) }

  loadQuestion();
}

// ========================================================
window.loadQuestion = loadQuestion;
window.checkAnswer = checkAnswer;
window.nextQuestion = nextQuestion;
window.toggleNavigator = toggleNavigator;
window.goToQuestion = goToQuestion;
window.toggleBookmark = toggleBookmark;
window.resetSystem = resetSystem;
window.closeReset = closeReset;
window.confirmReset = confirmReset;