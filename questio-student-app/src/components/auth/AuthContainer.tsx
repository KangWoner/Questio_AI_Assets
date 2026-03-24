import { useState, useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../../firebase';
import { motion } from 'framer-motion';

export default function AuthContainer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

      // Firestore에 사용자 문서 확인
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // 신규 가입자: 원장님 지시에 따라(임시) 가입 축하 Q-Token 100개를 자동 특별 부여
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: 'student', // B2C 학생 앱 사용자
          plan: 'basic',
          freeTokens: 100, // 가입 축하 토큰 100개 상향
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp()
        });
      } else {
        // 기존 가입자: 마지막 접속일자 업데이트만 수행
        await setDoc(userRef, {
          lastLoginAt: serverTimestamp()
        }, { merge: true });
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google 로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-slate-950 p-6 selection:bg-blue-500/30">
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm rounded-[32px] p-8 glass"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-6 shadow-xl shadow-blue-500/20">
            <span className="text-3xl">🧩</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-2">
            Questio Tutor
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            세계 최고의 초개인화 AI 선생님을<br/>만나보세요
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <p className="text-red-400 text-sm text-center font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="relative flex items-center justify-center w-full bg-white text-slate-800 font-semibold h-14 rounded-2xl transition-all active:scale-[0.98] hover:bg-slate-50 disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
            ) : (
              <>
                <svg className="absolute left-6 w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  <path fill="none" d="M1 1h22v22H1z" />
                </svg>
                <span>Google 계정으로 시작하기</span>
              </>
            )}
          </button>
          
          <div className="text-center pt-4">
            <p className="text-[11px] text-slate-500 font-medium pb-3 border-b border-slate-800/50 mb-3">
              신규 가입 시 <span className="text-blue-400">100 Q-Token</span> 무료 증정 🎉
            </p>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Google 계정으로 계속 진행하시면 당사의 <br/>
              <button className="underline hover:text-slate-300">이용약관</button> 및 <button className="underline hover:text-slate-300">개인정보 처리방침</button>에 동의하는 것으로 간주합니다.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
