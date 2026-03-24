import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'super_admin' | 'director' | 'student';
  institutionId: string;
  planType: 'basic' | 'tier1' | 'tier2' | 'tier3' | 'tier4';
  freeTokens: number;
  tokens: number;
  isSubscribed: boolean;
  subscriptionEndDate: any;
  createdAt: any;
  lastLoginAt: any;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  isSuperAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (!currentUser) {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<UserData>;
        setUserData({
          ...data,
          role: data.role || 'student',
          uid: user.uid,
          institutionId: data.institutionId || 'questio',
          freeTokens: data.freeTokens ?? 0,
          tokens: data.tokens ?? 0,
        } as UserData);
      } else {
        setUserData(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching user data stream:", error);
      setLoading(false);
    });

    return () => unsubscribeDoc();
  }, [user]);

  const isSuperAdmin = userData?.role === 'super_admin';

  return (
    <AuthContext.Provider value={{ user, userData, loading, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
