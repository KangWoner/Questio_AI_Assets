import { useState, useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, googleProvider, db } from '../../firebase';
import { motion } from 'framer-motion';

export default function AuthContainer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [franchiseCode, setFranchiseCode] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setFranchiseCode(code);
    }

    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.match(/kakaotalk/i) || userAgent.match(/line/i) || userAgent.match(/inapp/i)) {
      if (userAgent.match(/android/i)) {
        window.location.href = `intent://${window.location.href.replace(/https?:\/\//i, '')}#Intent;scheme=https;package=com.android.chrome;end`;
      } else {
        alert('현재 화면(카카오톡 등 내부 브라우저)에서는 구글 보안 정책상 로그인이 차단됩니다.\n\n우측 하단(또는 상단)의 쩜쩜쩜(···) 메뉴를 누르시고 [다른 브라우저로 열기] 또는 [Safari로 열기]를 선택해주세요!');
      }
    }
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // 사전 등록된 원장님인지 확인 (Director Check)
      const fQuery = query(collection(db, 'franchises'), where('directorEmail', '==', user.email));
      const franchiseSnap = await getDocs(fQuery);
      
      let isPreRegDirector = false;
      let matchedInstitutionId = franchiseCode || 'questio';
      
      if (!franchiseSnap.empty) {
         const fData = franchiseSnap.docs[0].data();
         isPreRegDirector = true;
         matchedInstitutionId = fData.institutionId;
      }

      // Firestore에 사용자 문서 확인
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const isB2B = matchedInstitutionId !== 'questio';
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: isPreRegDirector ? 'director' : 'student',
          institutionId: matchedInstitutionId,
          planType: 'basic',
          freeTokens: isB2B ? 100 : 30,
          tokens: isB2B ? 100 : 30,
          isSubscribed: false,
          subscriptionEndDate: null,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp()
        });
      } else {
        const updates: any = { lastLoginAt: serverTimestamp() };
        // 기존 가입자라도 나중에 원장님으로 사전 등록되었으면 권한/소속 승격
        if (isPreRegDirector && userSnap.data().role !== 'director') {
          updates.role = 'director';
          updates.institutionId = matchedInstitutionId;
        }
        await updateDoc(userRef, updates);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google 로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-transparent p-6 selection:bg-indigo-500/30">
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
        className="w-full max-w-sm rounded-[32px] p-8 glass flex flex-col items-center relative overflow-hidden"
      >
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-fuchsia-600/30 rounded-full blur-[60px] pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-600/30 rounded-full blur-[60px] pointer-events-none"></div>

        <div className="text-center mb-10 z-10 w-full">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[28px] bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 mb-6 shadow-[0_0_40px_rgba(99,102,241,0.4)] border border-white/20">
            <span className="text-4xl shadow-black/50 drop-shadow-lg">✨</span>
          </div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-fuchsia-100 tracking-tight mb-3 text-glow">
            Questio AI
          </h1>
          <p className="text-indigo-200 text-[15px] font-medium leading-relaxed">
            대치동 1타 AI 논술 첨삭 강사를<br/>만나보세요
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <p className="text-red-400 text-sm text-center font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-4 w-full z-10">
          <div className="mb-4 p-5 bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-[24px] shadow-inner relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
             <div className="flex items-center justify-center mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-lg shadow-fuchsia-500/30 tracking-wider">PREMIUM</span>
             </div>
             <p className="text-center text-[13px] font-bold text-white mb-1">
                B2B 가맹점 전용 혜택
             </p>
             <p className="text-center text-[12px] font-medium text-indigo-300 mb-5 leading-relaxed">
                가맹점 코드 입력 시 학생 1명당 <b className="text-fuchsia-300 text-[13px]">100 토큰</b> 자동 지급 및 2026 기출 분석 자료 즉시 제공
             </p>
             <div className="space-y-2 relative">
               <input 
                 type="text" 
                 placeholder="부여받은 기관 코드를 입력하세요"
                 value={franchiseCode}
                 onChange={(e) => setFranchiseCode(e.target.value)}
                 className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-5 py-4 text-[15px] text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all font-medium text-center shadow-inner"
               />
             </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="group relative flex items-center justify-center w-full bg-white/95 hover:bg-white text-slate-800 font-bold h-14 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 shadow-[0_4px_20px_rgba(255,255,255,0.1)] hover:shadow-[0_8px_30px_rgba(255,255,255,0.2)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
            ) : (
              <>
                <svg className="absolute left-6 w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  <path fill="none" d="M1 1h22v22H1z" />
                </svg>
                <span className="text-[15px]">Google 계정으로 시작하기</span>
              </>
            )}
          </button>
          
          <div className="text-center pt-5">
            <p className="text-[12px] text-slate-300 font-medium pb-4 border-b border-white/10 mb-4 inline-flex items-center gap-1.5">
              🚀 일반(B2C) 신규 가입 시 <span className="text-fuchsia-400 font-bold px-1.5 py-0.5 rounded-md bg-fuchsia-500/10">30 Q-Token</span> 무료 증정
            </p>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              로그인 시 당사의 <button className="text-indigo-400 hover:text-indigo-300 transition-colors">이용약관</button> 및 <button className="text-indigo-400 hover:text-indigo-300 transition-colors">개인정보 처리방침</button>에 동의합니다.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
