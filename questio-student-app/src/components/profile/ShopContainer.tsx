import { useEffect, useRef, useState } from 'react';
import { loadPaymentWidget, type PaymentWidgetInstance } from '@tosspayments/payment-widget-sdk';
import { ShoppingCart, X, CreditCard } from 'lucide-react';
import { auth } from '../../firebase';

export interface PackageData {
  id: string;
  name: string;
  price: number;
  tokens: number | 'limitless';
  description: string;
}

const packages: PackageData[] = [
  { id: '1', name: '베이직 패키지', price: 10000, tokens: 10, description: '10회 리포트 생성 (가벼운 첨삭용)' },
  { id: '2', name: '프리미엄 패키지', price: 25000, tokens: 30, description: '30회 리포트 생성 (약 20% 할인)' },
  { id: '3', name: '논술 파이널 이용권 (1개월)', price: 50000, tokens: 'limitless', description: '30일간 무제한 리포트 생성' },
];

const clientKey = "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";

export default function ShopContainer({ onClose }: { onClose: () => void }) {
  const paymentWidgetRef = useRef<PaymentWidgetInstance | null>(null);
  const paymentMethodsWidgetRef = useRef<ReturnType<PaymentWidgetInstance['renderPaymentMethods']> | null>(null);
  
  const [selectedPkg, setSelectedPkg] = useState<PackageData | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    if (!showPayment || !selectedPkg) return;

    (async () => {
      const user = auth.currentUser;
      const customerKey = user ? user.uid : "anonymous_" + Date.now();
      
      try {
        const paymentWidget = await loadPaymentWidget(clientKey, customerKey);
        
        const paymentMethodsWidget = paymentWidget.renderPaymentMethods(
          "#payment-method",
          { value: selectedPkg.price },
          { variantKey: "DEFAULT" }
        );
        
        paymentWidget.renderAgreement(
          '#agreement',
          { variantKey: 'AGREEMENT' }
        );
        
        paymentWidgetRef.current = paymentWidget;
        paymentMethodsWidgetRef.current = paymentMethodsWidget;
      } catch (err) {
        console.error("Failed to load Toss Widget:", err);
      }
    })();
  }, [showPayment]);

  // Update amount when package changes
  useEffect(() => {
    if (showPayment && selectedPkg && paymentMethodsWidgetRef.current) {
        paymentMethodsWidgetRef.current.updateAmount(selectedPkg.price);
    }
  }, [selectedPkg, showPayment]);

  const handlePayment = async () => {
    const paymentWidget = paymentWidgetRef.current;
    if (!paymentWidget || !selectedPkg) return;
    
    try {
      // 결제 요청: 테스트 모드에서는 승인 프로세스 없이 바로 성공창으로 넘어갑니다.
      await paymentWidget.requestPayment({
        orderId: `order_${Date.now()}_${selectedPkg.id}`,
        orderName: selectedPkg.name,
        customerName: auth.currentUser?.displayName || 'Tutor Student',
        customerEmail: auth.currentUser?.email || '',
        successUrl: window.location.origin + '/payment-success?pkg=' + selectedPkg.id,
        failUrl: window.location.origin + '/payment-fail',
      });
    } catch (err) {
      console.error(err);
      // Toss handles user cancellations/errors
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-950 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
               <ShoppingCart className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold dark:text-white">Q-Token 충전소</h2>
          </div>
          <button title="닫기" aria-label="닫기" onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
           {!showPayment ? (
               <div className="space-y-4">
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                     논술 리포트 생성을 위한 Q-Token 패키지를 선택해주세요.
                  </p>
                  {packages.map(pkg => (
                      <div 
                         key={pkg.id} 
                         onClick={() => setSelectedPkg(pkg)}
                         className={`border-2 p-4 rounded-2xl cursor-pointer transition-all ${selectedPkg?.id === pkg.id ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-800 hover:border-blue-300'}`}
                      >
                         <div className="flex justify-between items-center mb-1">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100">{pkg.name}</h3>
                            <span className="font-black text-blue-600 text-lg">{pkg.price.toLocaleString()}원</span>
                         </div>
                         <p className="text-sm text-slate-500">{pkg.description}</p>
                      </div>
                  ))}
                  
                  <button 
                     disabled={!selectedPkg}
                     onClick={() => setShowPayment(true)}
                     className="mt-6 w-full py-4 bg-blue-600 text-white font-bold rounded-2xl disabled:opacity-50 hover:bg-blue-700 transition"
                  >
                      결제 진행하기
                  </button>
               </div>
           ) : (
               <div>
                  <div className="flex items-center space-x-2 mb-6">
                     <button onClick={() => setShowPayment(false)} className="text-sm text-blue-600 font-medium">&larr; 옵션 다시 선택</button>
                     <span className="text-slate-300">|</span>
                     <span className="text-sm text-slate-600 font-bold">{selectedPkg?.name} ({selectedPkg?.price.toLocaleString()}원)</span>
                  </div>

                  {/* Toss Payment Widget Mounting Areas */}
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-4">
                      <div id="payment-method"></div>
                      <div id="agreement"></div>
                  </div>

                  <button 
                     onClick={handlePayment}
                     className="w-full py-4 bg-[#3182f6] text-white font-bold rounded-2xl flex justify-center items-center space-x-2 text-lg hover:bg-blue-700 active:scale-95 transition-all"
                  >
                      <CreditCard className="w-5 h-5"/>
                      <span>{selectedPkg?.price.toLocaleString()}원 결제하기</span>
                  </button>
                  <p className="text-center text-xs text-slate-400 mt-3 pb-3">테스트 모드이므로 실제 금액은 결제되지 않습니다.</p>
               </div>
           )}
        </div>
      </div>
    </div>
  );
}
