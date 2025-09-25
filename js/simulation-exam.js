// ==================== Firebase Init ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

let currentUser=null;
onAuthStateChanged(auth, (user)=>{
  if(!user){ window.location="auth.html"; }
  else { currentUser=user; }
});

// ==================== Variables ====================
let examQuestions = [];
let currentQ = 0;
let correctCount = 0;
let userAnswers = [];
let timerSeconds = 120 * 60; // 120 دقيقة = 7200 ثانية

// =============== Load Exam ==================
async function loadExam() {
  const systems = [
    "cardio","neuro","pediatrics","obgyn1","obgyn2",
    "chest","git","hematology","endocrinology",
    "rheumatology","orthopedics","generalsurgery",
    "emergency","ethics"
  ];
  let all = [];
  for (const sys of systems) {
    try {
      const data = await fetch(`questions/${sys}.json`).then(r => r.json());
      all = all.concat(data);
    } catch (err) { console.error(err); }
  }
  examQuestions = shuffle(all).slice(0, 100);
  loadQuestion();
  startTimer();
}

// =============== Shuffle ====================
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// =============== Load Question ==============
function loadQuestion() {
  if (currentQ >= examQuestions.length) { finishExam(); return; }
  const q = examQuestions[currentQ];
  const container = document.getElementById("questionContainer");
  container.innerHTML = `
    <div class="question-box">
      <p><b>Q${currentQ + 1}:</b> ${q.case}</p>
      <div class="options">
        ${q.options.map(opt =>
          `<button onclick="answerQuestion('${opt.replace(/'/g,"\\'")}','${q.correctAnswer.replace(/'/g,"\\'")}')">${opt}</button>`
        ).join("")}
      </div>
    </div>
  `;
}

// =============== Answer =====================
function answerQuestion(sel, correct) {
  if (sel === correct) correctCount++;
  userAnswers.push({
    question: examQuestions[currentQ].case,
    options: examQuestions[currentQ].options,
    correct: correct,
    selected: sel
  });
  currentQ++;
  loadQuestion();
}

// =============== Timer ======================
function startTimer() {
  const timerEl = document.getElementById("timer");
  const interval = setInterval(() => {
    if (timerSeconds <= 0) { clearInterval(interval); finishExam(); }
    let m = Math.floor(timerSeconds / 60), s = timerSeconds % 60, h = Math.floor(m / 60);
    m = m % 60;
    timerEl.textContent = `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
    timerSeconds--;
  }, 1000);
}

// =============== End Exam ===================
function confirmEndExam(){
  document.getElementById("endModal").classList.remove("hidden");
}
function closeEndExam(){
  document.getElementById("endModal").classList.add("hidden");
}

async function finishExam() {
  document.getElementById("endModal").classList.add("hidden");

  const total = examQuestions.length;   
  const score = `${correctCount}/${total}`;
  const percent = total > 0 ? Math.round((correctCount/total) * 100) : 0;
  const status = percent >= 50 ? "Pass ✅" : "Fail ❌";

  // حفظ في localStorage
  let exams = JSON.parse(localStorage.getItem("sim_exams") || "[]");
  const id = exams.length + 1;
  const date = new Date().toLocaleString();

  const newExam = { id, date, score, status };

  exams.push(newExam);
  localStorage.setItem("sim_exams", JSON.stringify(exams));

  // ✅ حفظ أونلاين كمان
  if(currentUser){
    try{
      const snap = await getDoc(doc(db,"users",currentUser.uid,"simulation","history"));
      let cloudExams=[];
      if(snap.exists()) cloudExams = snap.data().exams || [];
      cloudExams.push(newExam);
      await setDoc(doc(db,"users",currentUser.uid,"simulation","history"),{
        exams:cloudExams
      },{merge:true});
    }catch(err){ console.error(err); }
  }

  // عرض النتيجة
  document.getElementById("resultText").innerHTML = `
    You scored ${score} (${percent}%) – ${status}
  `;
  document.getElementById("resultModal").classList.remove("hidden");
}

// =============== Start Exam ===================
loadExam();

// =============== Expose to HTML ==============
window.answerQuestion = answerQuestion;
window.confirmEndExam = confirmEndExam;
window.closeEndExam = closeEndExam;
window.finishExam = finishExam;