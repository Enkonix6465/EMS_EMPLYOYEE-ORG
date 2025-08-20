import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNavigate } from "react-router-dom";

const SessionValidator = () => {
  const { user, sessionId, signOut } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !sessionId) return;

    const sessionRef = doc(db, "activeSessions", user.uid);

    const unsubscribe = onSnapshot(sessionRef, (snapshot) => {
      // If the session doc is deleted or the ID doesn't match, log out.
      if (!snapshot.exists() || snapshot.data().sessionId !== sessionId) {
        // Prevent sign-out if this session is already logged out.
        if (useAuthStore.getState().isAuthenticated) {
          signOut();
          navigate("/session-terminated");
        }
      }
    });

    return () => unsubscribe();
  }, [user, sessionId, signOut, navigate]);

  return null; // This component does not render anything
};

export default SessionValidator; 