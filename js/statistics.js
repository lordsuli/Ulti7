// ==================== Firebase Init ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase Config (من بياناتك اللي بعتهالي)
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
const chartContainer=document.getElementById("chartsContainer");
const wrongModal=document.getElementById("wrongModal");

let overallCorrect=0, overallWrong=0, overallTotal=0;
let currentWrongQs=[], currentWrongIdx=0;

// ========================================================
onAuthStateChanged(auth, async (user)=>{
  if(!user){
    window.location="auth.html";
  } else {
    document.body.style.display="flex";
    const uid = user.uid;

    // systems الي اتحلت من الFirestore/localStorage
    let systemsFound=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key.endsWith("_answered")){
        systemsFound.push(key.replace("_answered",""));
      }
    }

    // systems من Firestore
    const snap = await getDocs(collection(db,"users",uid,"systems"));
    snap.forEach(docSnap=>{
      if(!systemsFound.includes(docSnap.id)){
        systemsFound.push(docSnap.id);
      }
    });

    // Create chart cards
    systemsFound.forEach(sys=>createChartCard(uid,sys));

    // Render overall performance بعد delay
    setTimeout(()=>renderTotalChart(),1000);
  }
});

// ========================================================
// إنشاء مخطط (تشارت) لكل system
async function createChartCard(uid,system){
  // database
  const snap = await getDoc(doc(db,"users",uid,"systems",system));

  // local fallback
  const answered = JSON.parse(localStorage.getItem(`${system}_answered`)||"[]");
  const states=JSON.parse(localStorage.getItem(`${system}_state`)||"{}");

  let correct=0, wrong=0, wrongQs=[];

  // data من ملف JSON (لأن الأسئلة نفسها مش كلها مخزنة أونلاين)
  const data = await fetch(`questions/${system}.json`).then(r=>r.json());

  // وصل الداتا (إجابات محفوظة محلياً + Firestore)
  let answeredSet=new Set(answered);

  if(snap.exists()){
    const cloud = snap.data();
    if(cloud.answered){
      cloud.answered.forEach(id=>answeredSet.add(id));
    }
    // كمان لو فيه states cloud
    if(cloud.states){
      for(const [id,state] of Object.entries(cloud.states)){
        states[id]=state;
      }
    }
  }

  const allAnswered=[...answeredSet];

  allAnswered.forEach(id=>{
    const q= data.find(x=>x.CaseID===id);
    if(!q||!states[id]) return;
    if(states[id].isCorrect){
      correct++;
    } else {
      wrong++;
      wrongQs.push(q);
    }
  });

  const total=data.length;
  overallCorrect+=correct;
  overallWrong+=wrong;
  overallTotal+=total;
  const percentage= total>0?Math.round((correct/total)*100):0;

  // رسم الـ chart box
  const box=document.createElement("div");
  box.className="chart-box";
  box.innerHTML=`<h3>${system.toUpperCase()} (${percentage}%)</h3><canvas id="chart_${system}"></canvas>`;
  chartContainer.appendChild(box);

  const ctx=document.getElementById(`chart_${system}`).getContext("2d");
  new Chart(ctx,{
    type:'doughnut',
    data:{
      labels:['Correct','Wrong','Unanswered'],
      datasets:[{
        data:[correct,wrong,total-(correct+wrong)],
        backgroundColor:[
          gradientColor(ctx,'#43cea2','#185a9d'),  // teal gradient
          gradientColor(ctx,'#ef3b36','#8e0e00'),  // red gradient
          gradientColor(ctx,'#a18cd1','#6f00ff')  // violet gradient
        ],
        borderWidth:1,
        hoverOffset:12
      }]
    },
    options:{
      responsive:true,
      plugins:{ legend:{labels:{color:'white'}} },
      onClick:(evt,els)=>{
        if(els.length){
          const idx=els[0].index;
          if(idx===1 && wrongQs.length){ // wrong slice
            openWrongModal(system,wrongQs);
          }
        }
      }
    }
  });
}

// ========================================================
// Render total chart
function renderTotalChart(){
  const ctx=document.getElementById("totalChart").getContext("2d");
  new Chart(ctx,{
    type:'doughnut',
    data:{
      labels:['Correct','Wrong','Unanswered'],
      datasets:[{
        data:[
          overallCorrect,
          overallWrong,
          overallTotal-(overallCorrect+overallWrong)
        ],
        backgroundColor:[
          gradientColor(ctx,'#43cea2','#185a9d'),
          gradientColor(ctx,'#ef3b36','#8e0e00'),
          gradientColor(ctx,'#a18cd1','#6f00ff')
        ],
        borderWidth:1,
        hoverOffset:15
      }]
    },
    options:{
      plugins:{ legend:{labels:{color:'white'}} }
    }
  });
}

// ========================================================
// Helpers
function gradientColor(ctx,c1,c2){
  const g=ctx.createLinearGradient(0,0,0,200);
  g.addColorStop(0,c1); g.addColorStop(1,c2);
  return g;
}

// ========================================================
// Wrong Modal
function openWrongModal(system,qs){
  wrongModal.classList.remove("hidden");
  currentWrongQs=qs;
  currentWrongIdx=0;
  renderWrongQuestion();
}
function closeWrongModal(){ wrongModal.classList.add("hidden"); }

function renderWrongQuestion(){
  const q=currentWrongQs[currentWrongIdx];
  if(!q) return;
  document.getElementById("wrongQuestionBox").innerHTML=q.case;

  let exp=`<p><strong>Correct:</strong> ${q.explanation.correct}</p>`;
  if(Array.isArray(q.explanation.incorrect)){
    exp+="<ul>";
    q.explanation.incorrect.forEach(e=>{
      exp+=`<li><b>${e.option}:</b> ${e.reason}</li>`;
    });
    exp+="</ul>";
  }
  document.getElementById("wrongExplanationBox").innerHTML=exp;

  document.getElementById("wrongPrevBtn").disabled=(currentWrongIdx===0);
  document.getElementById("wrongNextBtn").disabled=(currentWrongIdx===currentWrongQs.length-1);
}
document.getElementById("wrongPrevBtn").onclick=()=>{
  if(currentWrongIdx>0){currentWrongIdx--;renderWrongQuestion();}
};
document.getElementById("wrongNextBtn").onclick=()=>{
  if(currentWrongIdx<currentWrongQs.length-1){currentWrongIdx++;renderWrongQuestion();}
};

// ========================================================
window.closeWrongModal = closeWrongModal;