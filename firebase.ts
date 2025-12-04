
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCKfFRG53GggBNgMyEuBGy-FJKFf4Eqni8",
  authDomain: "lumina-f7d88.firebaseapp.com",
  projectId: "lumina-f7d88",
  storageBucket: "lumina-f7d88.firebasestorage.app",
  messagingSenderId: "31263065340",
  appId: "1:31263065340:web:b7857a93cec5a70565c379",
  measurementId: "G-BRW8RLKY2X"
};

// Initialize Firebase (Modular)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Firestore with modern persistence settings
// This handles multiple tabs better and avoids "failed-precondition" errors
// It also provides a more robust offline experience
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { 
  auth, 
  db, 
  storage,
  googleProvider, 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  updateProfile 
};
