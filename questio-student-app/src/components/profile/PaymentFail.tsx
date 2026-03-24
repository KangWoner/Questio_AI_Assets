import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export default function PaymentFail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const message = params.get('message') || '결제를 취소했거나 오류가 발생했습니다.';

  return (
    <div className="flex flex-col items-center justify-center h-[100dvh] bg-slate-50 p-6">
      <XCircle className="w-16 h-16 text-red-500 mb-4" />
      <h2 className="text-2xl font-bold text-slate-800 mb-2">결제 실패</h2>
      <p className="text-slate-500 text-center mb-8">{message}</p>
      <button 
        onClick={() => navigate('/profile')}
        className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition"
      >
        내 정보로 돌아가기
      </button>
    </div>
  );
}
