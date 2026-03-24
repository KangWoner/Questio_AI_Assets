import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { User, PenTool } from 'lucide-react';
import ProfileContainer from './components/profile/ProfileContainer';
import AuthContainer from './components/auth/AuthContainer';
import ReportContainer from './components/report/ReportContainer';
import GenerateContainer from './components/generate/GenerateContainer';
import TaggerContainer from './components/generate/TaggerContainer';
import SuperAdminDashboard from './components/admin/SuperAdminDashboard';
import PaymentSuccess from './components/profile/PaymentSuccess';
import PaymentFail from './components/profile/PaymentFail';
import SubscriptionPayment from './components/subscription/SubscriptionPayment';
import './index.css';

function SubscriptionBanner({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="mx-4 mt-6 mb-2 p-4 rounded-[20px] bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-fuchsia-500/10 border border-indigo-500/20 shadow-inner flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div>
        <h3 className="text-[14px] font-extrabold text-slate-800 dark:text-white mb-1 flex items-center gap-1.5">
          <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] px-2 py-0.5 rounded-md tracking-wider">PRO</span>
          프리미엄 구독 업그레이드
        </h3>
        <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
          월 9,900원으로 Questio AI의 모든 기능을 무제한 사용하세요!
        </p>
      </div>
      <button 
        onClick={onUpgrade}
        className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[13px] font-bold rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
      >
        알아보기
      </button>
    </div>
  );
}

function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const navItems = [
    { path: '/', label: t('report') || '분석', icon: PenTool },
    { path: '/generate', label: '유사문제', icon: PenTool },
    { path: '/tagger', label: '자동태깅', icon: PenTool },
    { path: '/profile', label: t('profile') || '프로필', icon: User },
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

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><ReportContainer /></PageTransition>} />
        <Route path="/generate" element={<PageTransition><GenerateContainer /></PageTransition>} />
        <Route path="/tagger" element={<PageTransition><TaggerContainer /></PageTransition>} />
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

function AppContent() {
  const { user, userData, loading, isSuperAdmin } = useAuth();
  const [showPaywall, setShowPaywall] = React.useState(false);

  React.useEffect(() => {
    const handleOpenPaywall = () => setShowPaywall(true);
    window.addEventListener('openPaywall', handleOpenPaywall);
    return () => window.removeEventListener('openPaywall', handleOpenPaywall);
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[100dvh] flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !userData) {
    return <AuthContainer />;
  }

  if (isSuperAdmin) {
    return <SuperAdminDashboard />;
  }

  // 사용자가 인증된 일반 유저(원장, 학생)인 경우 메인 앱 가동
  // B2C 기본 유저이면서 구독하지 않은 경우 배너 표시
  const showBanner = userData.institutionId === 'questio' && !userData.isSubscribed;

  return (
    <BrowserRouter>
      <div className="w-full flex-col flex h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 overflow-hidden relative selection:bg-indigo-500/30">
        <main className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 pb-[60px] overflow-y-auto scroll-smooth">
            {showBanner && <SubscriptionBanner onUpgrade={() => setShowPaywall(true)} />}
            <AnimatedRoutes />
          </div>
        </main>
        <BottomNav />
        {showPaywall && <SubscriptionPayment onClose={() => setShowPaywall(false)} />}
      </div>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
