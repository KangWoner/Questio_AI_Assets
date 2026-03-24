import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Globe, GraduationCap, Zap, LogOut } from 'lucide-react';
import { auth, db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import ShopContainer from './ShopContainer';

export default function ProfileContainer() {
  const { t, i18n } = useTranslation();
  
  // Local state for user preferences
  const [lang, setLang] = useState(i18n.language || 'ko');
  const [audience, setAudience] = useState('고등학교 3학년(논술 실전/수능 실전)');
  const [freeTokens, setFreeTokens] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isShopOpen, setIsShopOpen] = useState(false);

  // Load saved preferences on mount from Firestore
  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (user) {
        setUserEmail(user.email);
        setUserName(user.displayName);
        
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.language) {
            setLang(data.language);
            i18n.changeLanguage(data.language);
          } else {
            // Default to localStorage or current i18n if none exists in db
            const savedLang = localStorage.getItem('appLanguage');
            if (savedLang && savedLang !== i18n.language) {
              i18n.changeLanguage(savedLang);
              setLang(savedLang);
            }
          }
          if (data.targetAudience) {
            setAudience(data.targetAudience);
          } else {
            const savedAudience = localStorage.getItem('targetAudience');
            if (savedAudience) setAudience(savedAudience);
          }
          if (data.freeTokens !== undefined) {
            setFreeTokens(data.freeTokens);
          }
        }
      }
    };
    fetchData();
  }, [i18n]);

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setLang(newLang);
    i18n.changeLanguage(newLang);
    localStorage.setItem('appLanguage', newLang);
    
    const user = auth.currentUser;
    if (user) await setDoc(doc(db, 'users', user.uid), { language: newLang }, { merge: true });
  };

  const handleAudienceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setAudience(val);
    localStorage.setItem('targetAudience', val);
    
    const user = auth.currentUser;
    if (user) await setDoc(doc(db, 'users', user.uid), { targetAudience: val }, { merge: true });
  };

  const handleLogout = async () => {
    const confirmLogout = window.confirm('정말 로그아웃 하시겠습니까?');
    if (confirmLogout) {
      try {
        await signOut(auth);
      } catch (error) {
        console.error('Logout failed', error);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAFC] font-sans pb-20 overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-10 bg-white shadow-sm border-b border-gray-100">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 overflow-hidden">
             {auth.currentUser?.photoURL ? (
                 <img src={auth.currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
             ) : (
                 <User className="w-8 h-8" />
             )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{userName || 'Student'}</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">{userEmail || 'Free User'}</p>
          </div>
        </div>
        
        {/* Token Balance */}
        <div className="mt-6 flex items-center px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/50 rounded-xl">
           <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white mr-3 shadow-md shadow-blue-500/20">
               <Zap className="w-4 h-4" />
           </div>
           <div>
               <p className="text-[11px] font-bold text-blue-500 uppercase tracking-widest">Available Q-Tokens</p>
               <div className="flex items-baseline space-x-1">
                   <span className="text-xl font-black text-gray-800">{freeTokens !== null ? freeTokens : '...'}</span>
                   <span className="text-sm font-semibold text-gray-500">개</span>
               </div>
           </div>
           
           <div className="ml-auto">
             <button
               onClick={() => setIsShopOpen(true)}
               className="px-4 py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-blue-500/20"
             >
               충전하기
             </button>
           </div>
        </div>
      </div>

      {/* Settings Section */}
      <div className="px-4 py-6 space-y-6">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider ml-2">{t('settings')}</h2>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          
          {/* Language Setting */}
          <div className="flex items-center justify-between p-4 border-b border-gray-50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Globe className="w-5 h-5" />
              </div>
              <span className="font-semibold text-gray-800">{t('language')}</span>
            </div>
            <select 
              value={lang} 
              onChange={handleLanguageChange}
              aria-label={t('language')}
              className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 outline-none font-medium"
            >
              <option value="ko">한국어 (Korean)</option>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="ja">日本語 (Japanese)</option>
            </select>
          </div>

          {/* Target Audience Setting */}
          <div className="flex items-center justify-between p-4 flex-wrap gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="font-semibold text-gray-800">{t('audience')}</span>
            </div>
            <select 
              value={audience} 
              onChange={handleAudienceChange}
              aria-label={t('audience')}
              className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 p-2 outline-none font-medium flex-1 sm:max-w-[200px]"
            >
              <option value="중학교 1학년">중학교 1학년</option>
              <option value="중학교 2학년">중학교 2학년</option>
              <option value="중학교 3학년">중학교 3학년</option>
              <option value="고등학교 1학년(논술 기초/수능 기초학습)">고등학교 1학년(논술 기초/수능 기초학습)</option>
              <option value="고등학교 2학년(논술 기본/수능 기본학습)">고등학교 2학년(논술 기본/수능 기본학습)</option>
              <option value="고등학교 3학년(논술 실전/수능 실전)">고등학교 3학년(논술 실전/수능 실전)</option>
            </select>
          </div>

        </div>

        {/* Logout Button */}
        <div className="mt-8">
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center space-x-2 w-full py-4 bg-white hover:bg-red-50 text-red-500 font-bold rounded-2xl transition-all shadow-sm border border-red-100 active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span>로그아웃</span>
          </button>
        </div>
      </div>

      {/* Business Info Footer */}
      <div className="px-4 py-8 text-center text-[11px] text-gray-400 leading-relaxed border-t border-gray-100 mt-auto">
        <p className="font-bold text-gray-500 mb-1">상호명: 퀘스티오(Questio)</p>
        <p>사업자 형태: 개인사업자 | 사업자등록번호: 551-09-03449</p>
        <p>통신판매업 신고번호: 2026-인천미추홀-0365</p>
        <p>사업장 주소: 인천 미추홀구 숙골로 112번길 11. 507-1901</p>
      </div>

      {isShopOpen && (
        <ShopContainer onClose={() => setIsShopOpen(false)} />
      )}
    </div>
  );
}
