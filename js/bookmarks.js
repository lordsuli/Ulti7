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

// ========================================================

const container = document.getElementById("bookmarksPage");
const modal=document.getElementById("bookmarkModal");
const modalQ=document.getElementById("modalQuestion");
const modalExp=document.getElementById("modalExplanation");
const unBtn=document.getElementById("unBookmarkBtn");
const nextBtn=document.getElementById("nextBookmarkBtn");
const prevBtn=document.getElementById("prevBookmarkBtn");

let currentSys=null, currentId=null;
let currentBookmarks=[], currentData=null;

// ========================================================
// بعد التأكد من المستخدم، نجيب الداتا من Firestore + ندمجها مع localStorage
onAuthStateChanged(auth, async (user)=>{
  if(!user){
    window.location="auth.html";
  } else {
    document.body.style.display="flex";

    // 👇 نسحب كل الـ systems اللي فيها bookmarks من الـ localStorage / Firestore
    await syncUserBookmarks(user.uid);

    // نرندر كل bookmark systems بعد التزامن
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key.endsWith("_bookmarks")){
        const system=key.replace("_bookmarks","");
        const bookmarks=JSON.parse(localStorage.getItem(key) || "[]");
        if(bookmarks.length>0){
          renderSystem(system, bookmarks);
        }
      }
    }
  }
});

// ========================================================
// Sync bookmarks (localStorage + Firestore)
async function syncUserBookmarks(userId){
  const systems = []; // كل السيستمز اللي عندك محليًا
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    if(key.endsWith("_bookmarks")){
      systems.push(key.replace("_bookmarks",""));
    }
  }

  // جلب bookmarks لكل system من Firestore ودمجها
  for(const sys of systems){
    try{
      const snap = await getDoc(doc(db, "users", userId, "systems", sys));
      if(snap.exists()){
        const cloud = snap.data().bookmarks || [];
        const local = JSON.parse(localStorage.getItem(`${sys}_bookmarks`) || "[]");
        // نعمل Union بين الاتنين
        const merged = Array.from(new Set([...local, ...cloud]));
        localStorage.setItem(`${sys}_bookmarks`, JSON.stringify(merged));
        // نعمل save merged للـ Firestore كمان
        await setDoc(doc(db, "users", userId, "systems", sys), {
          bookmarks: merged
        }, { merge:true });
      }
    } catch(e){
      console.error(e);
    }
  }
}

// ========================================================
// Rendering
function renderSystem(system, bookmarks){
  const sysDiv=document.createElement("div");
  sysDiv.className="system-box";
  sysDiv.innerHTML=`<h3>${system.toUpperCase()}</h3><div class="bookmark-questions"></div>`;
  const inner=sysDiv.querySelector(".bookmark-questions");

  fetch(`questions/${system}.json`).then(r=>r.json()).then(data=>{
    bookmarks.forEach(id=>{
      const qIndex=data.findIndex(x=>x.CaseID===id);
      const q=data[qIndex];
      if(q){
        const qDiv=document.createElement("div");
        qDiv.className="bookmark-card";
        qDiv.textContent=`Q${qIndex+1}`;
        qDiv.onclick=()=>openModal(system,id,q,bookmarks,data);
        inner.appendChild(qDiv);
      }
    });
  });

  sysDiv.querySelector("h3").onclick=()=>sysDiv.classList.toggle("active");
  container.appendChild(sysDiv);
}

// ========================================================
// Modal Functions
function openModal(system,id,q,bookmarks,data){
  modal.classList.add("show");
  modalQ.innerHTML=q.case;

  let exp=`
    <div class="explanation-box">
      <p><strong>Correct:</strong> ${q.explanation.correct}</p>
  `;
  if(Array.isArray(q.explanation.incorrect)){
    exp+="<ul>";
    q.explanation.incorrect.forEach(e=>{
      exp+=`<li><b>${e.option}:</b> ${e.reason}</li>`;
    });
    exp+="</ul>";
  }
  exp+="</div>";
  modalExp.innerHTML=exp;

  currentSys=system;
  currentId=id;
  currentBookmarks=bookmarks;
  currentData=data;

  updateNavButtons();
}

function closeModal(){
  modal.classList.remove("show");
}

function updateNavButtons(){
  const idx=currentBookmarks.indexOf(currentId);
  prevBtn.disabled = (idx<=0);
  nextBtn.disabled = (idx===-1 || idx>=currentBookmarks.length-1);
}

nextBtn.onclick=()=>{
  const idx=currentBookmarks.indexOf(currentId);
  if(idx!==-1 && idx<currentBookmarks.length-1){
    const nextId=currentBookmarks[idx+1];
    const q=currentData.find(x=>x.CaseID===nextId);
    if(q) openModal(currentSys,nextId,q,currentBookmarks,currentData);
  }
}

prevBtn.onclick=()=>{
  const idx=currentBookmarks.indexOf(currentId);
  if(idx>0){
    const prevId=currentBookmarks[idx-1];
    const q=currentData.find(x=>x.CaseID===prevId);
    if(q) openModal(currentSys,prevId,q,currentBookmarks,currentData);
  }
}

// ========================================================
// Un-Bookmark (remove محلي + Firestore)
unBtn.onclick=async ()=>{
  let arr=JSON.parse(localStorage.getItem(`${currentSys}_bookmarks`)||"[]");
  arr=arr.filter(x=>x!==currentId);
  localStorage.setItem(`${currentSys}_bookmarks`,JSON.stringify(arr));

  const user = auth.currentUser;
  if(user){
    await setDoc(doc(db, "users", user.uid, "systems", currentSys), {
      bookmarks: arr
    }, { merge:true });
  }
  closeModal();
  location.reload();
};

// ========================================================
// Expose for HTML buttons
window.closeModal = closeModal;