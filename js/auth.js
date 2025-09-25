// ==================== Firebase Init ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
         updateProfile, GoogleAuthProvider, signInWithPopup } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔑 Config بتاعك (ثابت)
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

// ==================== Logic ====================
let isLogin = true;

// ✅ Toggle between forms
window.toggleForm = function(){
  const formContainer = document.getElementById("formContainer");
  formContainer.classList.add(isLogin ? "slide-signup":"slide-login");

  setTimeout(()=>{
    isLogin = !isLogin;
    document.getElementById("formTitle").textContent = isLogin ? "Login" : "Sign Up";
    document.querySelector(".toggle").textContent   = isLogin
      ? "Don't have an account? Sign up"
      : "Already have an account? Login";
    document.getElementById("nameField").classList.toggle("hidden", isLogin);
    formContainer.classList.remove("slide-signup","slide-login");
  },300);
}

// ✅ Submit form
window.submitForm = async function(){
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if(isLogin){
    // ---------------- Login ----------------
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location = "index.html";
    } catch(err){ alert(err.message); }
  } else {
    // ---------------- Sign Up ----------------
    const name = document.getElementById("nameField").value.trim();
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      // Save in Firestore
      await setDoc(doc(db, "users", cred.user.uid), {
        name: name,
        email: email,
        createdAt: new Date()
      });
      alert("🎉 Account created successfully");
      window.location = "index.html";
    } catch(err){ alert(err.message); }
  }
}

// ✅ Google Login
window.loginWithGoogle = async function(){
  const provider = new GoogleAuthProvider();
  try{
    const result = await signInWithPopup(auth, provider);
    const user   = result.user;
    await setDoc(doc(db,"users", user.uid), {
      name:user.displayName,
      email:user.email,
      createdAt:new Date()
    },{merge:true});
    window.location = "index.html";
  }catch(err){ alert(err.message); }
}