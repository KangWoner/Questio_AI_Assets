import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { Home, Search, MessageCircle, User } from 'lucide-react';
import SearchContainer from './components/search/SearchContainer';
import ChatContainer from './components/chat/ChatContainer';
import AuthContainer from './components/auth/AuthContainer';
import PaymentSuccess from './components/profile/PaymentSuccess';
import PaymentFail from './components/profile/PaymentFail';
import ProfileContainer from './components/profile/ProfileContainer';
import './index.css';

function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const navItems = [
    { path: '/', label: t('home'), icon: Home },
    { path: '/search', label: t('search'), icon: Search },
    { path: '/chat', label: t('tutor'), icon: MessageCircle },
    { path: '/profile', label: t('profile'), icon: User },
  ];

  return (
    <div className="fixed bottom-0 w-full bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 pb-safe z-50">
      <div className="flex justify-around items-center h-[60px] max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all ${
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Icon className="w-[22px] h-[22px] mb-[2px]" strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function HomePlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
      <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-3xl flex items-center justify-center flex-shrink-0 animate-bounce">
        <Home className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Questio Tutor</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm">초개인화 수학 논술 튜터</p>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><HomePlaceholder /></PageTransition>} />
        <Route path="/search" element={<PageTransition><SearchContainer /></PageTransition>} />
        <Route path="/chat" element={<PageTransition><ChatContainer /></PageTransition>} />
        <Route path="/profile" element={<PageTransition><ProfileContainer /></PageTransition>} />
        <Route path="/payment-success" element={<PageTransition><PaymentSuccess /></PageTransition>} />
        <Route path="/payment-fail" element={<PageTransition><PaymentFail /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="h-full w-full"
    >
      {children}
    </motion.div>
  );
}

function AuthWrapper() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[100dvh] flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthContainer />;
  }

  // 사용자가 인증된 경우 메인 앱 가동
  return (
    <BrowserRouter>
      <div className="w-full flex-col flex h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 overflow-hidden relative selection:bg-blue-200">
        {/* Main Routing Content Area */}
        <main className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 pb-[60px] overflow-y-auto">
            <AnimatedRoutes />
          </div>
        </main>
        
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthWrapper />
  );
}

export default App;
