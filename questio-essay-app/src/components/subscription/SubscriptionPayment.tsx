import { useEffect, useRef, useState } from 'react';
import { loadPaymentWidget, type PaymentWidgetInstance } from '@tosspayments/payment-widget-sdk';
import { X, CreditCard, Sparkles, CheckCircle2 } from 'lucide-react';
import { auth } from '../../firebase';

const clientKey = "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";

export default function SubscriptionPayment({ onClose }: { onClose: () => void }) {
  const paymentWidgetRef = useRef<PaymentWidgetInstance | null>(null);
  const paymentMethodsWidgetRef = useRef<ReturnType<PaymentWidgetInstance['renderPaymentMethods']> | null>(null);
  const [loading, setLoading] = useState(true);

  const price = 9900;
  const planName = "Questio AI 프리미엄 구독 (1개월)";

  useEffect(() => {
    (async () => {
      const user = auth.currentUser;
      const customerKey = user ? user.uid : "anonymous_" + Date.now();
      
      try {
        const paymentWidget = await loadPaymentWidget(clientKey, customerKey);
        
        const paymentMethodsWidget = paymentWidget.renderPaymentMethods(
          "#payment-method",
          { value: price },
          { variantKey: "DEFAULT" }
        );
        
        paymentWidget.renderAgreement(
          '#agreement',
          { variantKey: 'AGREEMENT' }
        );
        
        paymentWidgetRef.current = paymentWidget;
        paymentMethodsWidgetRef.current = paymentMethodsWidget;
        setLoading(false);
      } catch (err) {
        console.error("Failed to load Toss Widget:", err);
        setLoading(false);
      }
    })();
  }, []);

  const handlePayment = async () => {
    const paymentWidget = paymentWidgetRef.current;
    if (!paymentWidget) return;
    
    try {
      await paymentWidget.requestPayment({
        orderId: `order_sub_${Date.now()}`,
        orderName: planName,
        customerName: auth.currentUser?.displayName || 'Tutor Student',
        customerEmail: auth.currentUser?.email || '',
        successUrl: window.location.origin + '/payment-success?pkg=sub',
        failUrl: window.location.origin + '/payment-fail',
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-950 w-full max-w-lg rounded-[28px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg">
               <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">프리미엄 구독</h2>
          </div>
          <button title="닫기" aria-label="닫기" onClick={onClose} className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-full transition-colors active:scale-95">
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
           <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-5 rounded-[24px] border border-indigo-100 dark:border-indigo-500/20">
               <h3 className="font-extrabold text-slate-800 dark:text-white text-lg mb-1">{planName}</h3>
               <p className="font-black text-indigo-600 dark:text-indigo-400 text-2xl mb-4 flex items-baseline gap-1">
                   ₩9,900 <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400">/ 월</span>
               </p>
               
               <ul className="space-y-2.5 mt-2">
                   <li className="flex items-center gap-2 text-[14px] text-slate-700 dark:text-slate-300 font-bold">
                       <CheckCircle2 className="w-4.5 h-4.5 text-indigo-500" /> 
                       <span>AI 논술 유사 문제 생성 무제한</span>
                   </li>
                   <li className="flex items-center gap-2 text-[14px] text-slate-700 dark:text-slate-300 font-bold">
                       <CheckCircle2 className="w-4.5 h-4.5 text-indigo-500" /> 
                       <span>Vertex AI 기반 자동 태깅 분석 무제한</span>
                   </li>
                   <li className="flex items-center gap-2 text-[14px] text-slate-700 dark:text-slate-300 font-bold">
                       <CheckCircle2 className="w-4.5 h-4.5 text-indigo-500" /> 
                       <span>프리미엄 AI 튜터 1:1 질문 무제한</span>
                   </li>
               </ul>
           </div>

           {/* Toss Payment Widget Mounting Areas */}
           <div className={`transition-opacity duration-500 ${loading ? 'opacity-0 hidden' : 'opacity-100 block'}`}>
             <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[20px] border border-slate-200 dark:border-white/10 overflow-hidden mb-5 p-1">
                 <div id="payment-method"></div>
                 <div id="agreement"></div>
             </div>

             <button 
                onClick={handlePayment}
                className="w-full py-4.5 bg-gradient-to-r from-[#3182f6] to-[#2563eb] text-white font-bold rounded-[20px] flex justify-center items-center space-x-2 text-[16px] hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(49,130,246,0.3)]"
             >
                 <CreditCard className="w-5 h-5"/>
                 <span>{price.toLocaleString()}원 결제하기</span>
             </button>
             <p className="text-center text-[11px] text-slate-400 mt-4 pb-2 font-medium">테스트 결제 모드입니다. 실제 청구되지 않습니다.</p>
           </div>
           
           {loading && (
             <div className="flex flex-col justify-center items-center py-10 space-y-4">
               <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
               <span className="text-sm font-bold text-slate-500">결제 모듈을 불러오는 중...</span>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
