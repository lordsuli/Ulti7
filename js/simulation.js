// ==================== Firebase Init ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } 
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

let currentUser=null;

// ==================== Page Init ====================
onAuthStateChanged(auth, async (user)=>{
  if(!user){
    window.location="auth.html";
  } else {
    document.body.style.display="flex";
    currentUser=user;
    await loadExams();
  }
});

// ==================== UI Controls ====================
function showEnroll() {
  document.getElementById("enrollModal").classList.remove("hidden");
}
function closeEnroll() {
  document.getElementById("enrollModal").classList.add("hidden");
}
function generateExam() {
  window.location.href = "simulation-exam.html";
}

// ==================== Exams Management ====================
async function loadExams() {
  const div = document.getElementById("previousExams");

  // local data
  let exams = JSON.parse(localStorage.getItem("sim_exams") || "[]");

  // cloud data
  if(currentUser){
    try{
      const snap = await getDoc(doc(db,"users",currentUser.uid,"simulation","history"));
      if(snap.exists()){
        const cloudExams = snap.data().exams || [];
        // Union cloud+local
        exams = mergeExams(exams,cloudExams);
        // update local & cloud with merged
        localStorage.setItem("sim_exams",JSON.stringify(exams));
        await setDoc(doc(db,"users",currentUser.uid,"simulation","history"),{
          exams:exams
        },{merge:true});
      }
    }catch(err){console.error(err);}
  }

  if (!exams.length) {
    div.innerHTML = "<p style='color:#aaa;'>No previous exams</p>";
    return;
  }

  let html = "<table><tr><th>Exam</th><th>Date</th><th>Score</th><th>Status</th></tr>";
  exams.forEach(e => {
    html += `
      <tr>
        <td>${e.id}</td>
        <td>${e.date}</td>
        <td>${e.score}</td>
        <td>${e.status}</td>
      </tr>`;
  });
  html += "</table>";
  div.innerHTML = html;
}

function resetExams() {
  if (confirm("⚠️ Reset all simulation exams?")) {
    localStorage.removeItem("sim_exams");
    if(currentUser){
      setDoc(doc(db,"users",currentUser.uid,"simulation","history"),{
        exams:[]
      },{merge:true});
    }
    loadExams();
  }
}

// Merge Local+Cloud exams (بنعتمد على exam.id كونه unique)
function mergeExams(local,cloud){
  const map=new Map();
  [...local,...cloud].forEach(ex=>map.set(ex.id,ex));
  return Array.from(map.values()).sort((a,b)=>new Date(b.date)-new Date(a.date));
}

// ==================== Expose for HTML ====================
window.showEnroll = showEnroll;
window.closeEnroll = closeEnroll;
window.generateExam = generateExam;
window.resetExams = resetExams;