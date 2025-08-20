import { create } from "zustand";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  setSessionId: (sessionId: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  sessionId: localStorage.getItem("sessionId"), // Load session ID from localStorage
  
  setSessionId: (sessionId) => {
    set({ sessionId });
    if (sessionId) {
      localStorage.setItem("sessionId", sessionId);
    } else {
      localStorage.removeItem("sessionId");
    }
  },

  signIn: async (email, password) => {
    const auth = getAuth();
    try {
      set({ isLoading: true, error: null });
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      set({
        user: userCredential.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  signOut: async () => {
    const auth = getAuth();
    const user = get().user;
    const sessionId = get().sessionId;
    
    try {
      // Clear the active session from Firestore with timeout
    if (user) {
        try {
      const sessionRef = doc(db, "activeSessions", user.uid);
          const sessionSnap = await Promise.race([
            getDoc(sessionRef),
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000))
          ]);
      // Only delete the session if it's the current one, to prevent race conditions
      if (sessionSnap.exists() && sessionSnap.data().sessionId === sessionId) {
            await Promise.race([
              deleteDoc(sessionRef),
              new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000))
            ]);
      }
        } catch (error) {
          console.error("Error clearing session from Firestore:", error);
          // Continue with logout even if session cleanup fails
        }
      }
      
      // Sign out from Firebase Auth with timeout
      await Promise.race([
        firebaseSignOut(auth),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000))
      ]);
      
    get().setSessionId(null); // Clear session from store and localStorage
    set({ user: null, isAuthenticated: false });
    } catch (error) {
      console.error("Error during signOut:", error);
      // Force clear local state even if Firebase operations fail
      get().setSessionId(null);
      set({ user: null, isAuthenticated: false });
      throw error;
    }
  },

  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    });
    if (!user) {
      // If user is null, ensure session is also cleared
      get().setSessionId(null);
    }
  },
}));

// Initialize auth state listener
const auth = getAuth();
onAuthStateChanged(auth, (user) => {
  useAuthStore.getState().setUser(user);
});
