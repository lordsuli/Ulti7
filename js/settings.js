// ==================== Firebase Init ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, updateProfile, updatePassword as fbUpdatePass, deleteUser } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔑 Config
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

// ==================== Guard ====================
onAuthStateChanged(auth, (user)=>{
  if(!user){ window.location="auth.html"; }
  else { document.body.style.display="block"; }
});

// ==================== Update Name ====================
async function updateName(){
  const newName=document.getElementById("newName").value.trim();
  const user=auth.currentUser;
  if(newName && user){
    try {
      await updateProfile(user,{displayName:newName});
      // ✅ محدث كمان في Firestore
      await setDoc(doc(db,"users",user.uid),{
        name:newName
      },{merge:true});
      alert("✅ Name updated");
      document.getElementById("newName").value="";
    } catch(err){ alert(err.message); }
  }
}

// ==================== Update Password ====================
async function updatePassword(){
  const newPass=document.getElementById("newPassword").value.trim();
  const user=auth.currentUser;
  if(newPass && user){
    try {
      await fbUpdatePass(user,newPass);
      alert("🔑 Password updated");
      document.getElementById("newPassword").value="";
    } catch(err){ alert(err.message); }
  }
}

// ==================== Delete Account ====================
async function deleteAccount(){
  if(!confirm("⚠️ Are you sure? This cannot be undone.")) return;
  const user=auth.currentUser;
  try {
    await deleteUser(user);
    alert("❌ Account deleted");
    window.location="auth.html";
  } catch(err){ alert(err.message); }
}

// ==================== Expose for HTML Buttons ====================
window.updateName = updateName;
window.updatePassword = updatePassword;
window.deleteAccount = deleteAccount;