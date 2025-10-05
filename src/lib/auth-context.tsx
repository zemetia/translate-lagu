"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface UserData {
  uid: string;
  fullName: string;
  email: string;
  geminiApiKey: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isRegistrationComplete: boolean;
  signInWithGoogle: () => Promise<void>;
  completeRegistration: (fullName: string, geminiApiKey: string) => Promise<void>;
  updateGeminiApiKey: (geminiApiKey: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistrationComplete, setIsRegistrationComplete] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (user) {
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserData;
          setUserData(data);
          // Check if registration is complete (has required fields)
          setIsRegistrationComplete(!!(data.fullName && data.geminiApiKey));
        } else {
          setUserData(null);
          setIsRegistrationComplete(false);
        }
      } else {
        setUserData(null);
        setIsRegistrationComplete(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user document exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (!userDoc.exists()) {
        // Create initial user document with email only
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error: any) {
      console.error('Google sign in error:', error);
      throw new Error(error.message || 'Failed to sign in with Google');
    }
  };

  const completeRegistration = async (fullName: string, geminiApiKey: string) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      const userData: UserData = {
        uid: user.uid,
        fullName,
        email: user.email || '',
        geminiApiKey,
      };

      await setDoc(doc(db, 'users', user.uid), {
        ...userData,
        updatedAt: new Date(),
      }, { merge: true });

      setUserData(userData);
      setIsRegistrationComplete(true);
    } catch (error: any) {
      console.error('Complete registration error:', error);
      throw new Error(error.message || 'Failed to complete registration');
    }
  };

  const updateGeminiApiKey = async (geminiApiKey: string) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      await setDoc(doc(db, 'users', user.uid), {
        geminiApiKey,
        updatedAt: new Date(),
      }, { merge: true });

      // Update local userData state
      setUserData(prevData => prevData ? { ...prevData, geminiApiKey } : null);
    } catch (error: any) {
      console.error('Update API key error:', error);
      throw new Error(error.message || 'Failed to update API key');
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUserData(null);
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error(error.message || 'Failed to sign out');
    }
  };

  const value = {
    user,
    userData,
    loading,
    isRegistrationComplete,
    signInWithGoogle,
    completeRegistration,
    updateGeminiApiKey,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
