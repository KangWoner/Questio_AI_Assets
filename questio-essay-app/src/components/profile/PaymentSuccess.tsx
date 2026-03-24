import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { auth, db } from '../../firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('처리중...');

  useEffect(() => {
    const processPayment = async () => {
      const pkgId = params.get('pkg');
      const orderId = params.get('orderId');
      const paymentKey = params.get('paymentKey');
      const amount = params.get('amount');

      if (!pkgId || !orderId || !paymentKey || !amount) {
        setStatus('잘못된 접근입니다.');
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        setStatus('로그인이 필요합니다.');
        return;
      }

      try {
        let tokensToAdd = 0;
        if (pkgId === '1') tokensToAdd = 10;
        else if (pkgId === '2') tokensToAdd = 30;
        else if (pkgId === '3') tokensToAdd = 999; // 무제한 임시 처리

        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          // Token & Subscription 처리
          if (pkgId === 'sub') {
             // 구독 패키지 결제 성공 시
             const today = new Date();
             const nextMonth = new Date(today.setMonth(today.getMonth() + 1));
             
             await updateDoc(userRef, {
               isSubscribed: true,
               planType: 'basic',
               subscriptionEndDate: nextMonth.toISOString(),
               freeTokens: 'limitless' // 구독 기간 내 무제한 사용
             });
          } else {
             // 단건 토큰 패키지 결제 성공 시
             await updateDoc(userRef, {
               freeTokens: snap.data().freeTokens === 'limitless' ? 'limitless' : (pkgId === '3' ? 'limitless' : increment(tokensToAdd))
             });
          }
        }
        
        setStatus(pkgId === 'sub' ? '결제가 완료되었습니다! 프리미엄 기능이 활성화되었습니다.' : '결제가 완료되었습니다! Q-Token이 충전되었습니다.');
      } catch (err) {
        console.error(err);
        setStatus('토큰 지급 중 오류가 발생했습니다.');
      }
    };

    processPayment();
  }, [params]);

  return (
    <div className="flex flex-col items-center justify-center h-[100dvh] bg-slate-50 p-6">
      <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
      <h2 className="text-2xl font-bold text-slate-800 mb-2">{status}</h2>
      <p className="text-slate-500 text-center mb-8">테스트 결제가 성공적으로 승인되었습니다.</p>
      <button 
        onClick={() => navigate('/profile')}
        className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition"
      >
        내 정보로 돌아가기
      </button>
    </div>
  );
}
