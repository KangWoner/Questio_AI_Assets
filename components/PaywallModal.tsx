import React from 'react';

import { loadTossPayments } from '@tosspayments/payment-sdk';

interface PaywallModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ isOpen, onClose }) => {
    const handlePayment = async (plan: 'basic' | 'pro') => {
        try {
            const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;
            if (!clientKey) {
                alert("결제 크라이언트 키가 설정되지 않았습니다.");
                return;
            }
            const tossPayments = await loadTossPayments(clientKey);
            
            const amount = plan === 'basic' ? 99000 : 299000;
            const orderId = `order_${Math.random().toString(36).substr(2, 9)}`; // 실제 상용에선 DB 식별자 사용
            const orderName = `Questio AI ${plan === 'basic' ? 'Basic' : 'Pro'} Plan`;
            
            await tossPayments.requestPayment('카드', {
                amount,
                orderId,
                orderName,
                successUrl: window.location.origin + '/success',
                failUrl: window.location.origin + '/fail',
            });
        } catch (error: any) {
            console.error('결제 에러:', error);
            // 에러 객체가 문자열 형태의 취소 메시지를 포함하거나 USER_CANCEL 코드일 경우 알림창을 띄우지 않습니다.
            const isCancel = error?.code === 'USER_CANCEL' || error?.message?.includes('취소') || String(error).includes('취소');
            if (!isCancel) {
                alert('결제창 호출에 실패했습니다: ' + (error?.message || error));
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="relative w-full max-w-4xl p-10 bg-slate-900 border border-slate-700/50 rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-fuchsia-600/20 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-600/20 blur-[100px] rounded-full pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

                <button
                    onClick={onClose}
                    title="닫기"
                    aria-label="닫기"
                    className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
                >
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="text-center space-y-4 mb-12 relative z-10">
                    <div className="inline-block px-4 py-1 bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 border border-fuchsia-500/30 rounded-full text-fuchsia-400 text-[10px] font-black tracking-widest uppercase shadow-[0_0_15px_rgba(217,70,239,0.3)]">
                        Free Trial Ended
                    </div>
                    <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">
                        Questio <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">Pro</span>
                    </h2>
                    <p className="text-sm font-bold text-slate-400">무료 채점 토큰을 모두 소진했습니다. 무제한 AI 분석의 힘을 경험해 보세요!</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    {/* Basic Plan */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-[2rem] p-8 flex flex-col justify-between hover:border-cyan-500/50 transition-colors group">
                        <div>
                            <h3 className="text-xl font-black text-slate-200 uppercase tracking-tight mb-2">Basic Plan</h3>
                            <p className="text-xs text-slate-400 mb-6">소규모 학원 및 개인 교습용</p>
                            <div className="text-3xl font-black text-white mb-6">
                                ₩99,000 <span className="text-sm text-slate-500 font-normal">/ 월</span>
                            </div>
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-center text-sm text-slate-300 font-medium">
                                    <svg className="w-5 h-5 text-cyan-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    월 100건 채점 토큰 제공
                                </li>
                                <li className="flex items-center text-sm text-slate-300 font-medium">
                                    <svg className="w-5 h-5 text-cyan-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Standard AI (Gemini Flash)
                                </li>
                            </ul>
                        </div>
                        <button
                            onClick={() => handlePayment('basic')}
                            className="w-full py-4 rounded-xl bg-slate-700 text-white font-black text-sm uppercase tracking-widest hover:bg-slate-600 transition-colors"
                        >
                            Start Basic
                        </button>
                    </div>

                    {/* Pro Plan */}
                    <div className="bg-gradient-to-b from-fuchsia-900/40 to-slate-900/80 border border-fuchsia-500/50 rounded-[2rem] p-8 flex flex-col justify-between hover:shadow-[0_0_30px_rgba(217,70,239,0.2)] transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 px-4 py-1 bg-fuchsia-500 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-xl">Popular</div>
                        <div>
                            <h3 className="text-xl font-black text-fuchsia-400 uppercase tracking-tight mb-2">Pro Plan</h3>
                            <p className="text-xs text-slate-400 mb-6">대형 학원 및 전문 강사용 무제한 분석</p>
                            <div className="text-3xl font-black text-white mb-6">
                                ₩299,000 <span className="text-sm text-slate-500 font-normal">/ 월</span>
                            </div>
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-center text-sm text-slate-200 font-medium">
                                    <svg className="w-5 h-5 text-fuchsia-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    무제한 채점 토큰 제공
                                </li>
                                <li className="flex items-center text-sm text-slate-200 font-medium">
                                    <svg className="w-5 h-5 text-fuchsia-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Professional AI (Gemini Pro) 탑재
                                </li>
                                <li className="flex items-center text-sm text-slate-200 font-medium">
                                    <svg className="w-5 h-5 text-fuchsia-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    학습 데이터 맞춤형 파인튜닝 지원
                                </li>
                            </ul>
                        </div>
                        <button
                            onClick={() => handlePayment('pro')}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-black text-sm uppercase tracking-widest hover:from-fuchsia-500 hover:to-purple-500 transition-colors shadow-lg"
                        >
                            Upgrade to Pro
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
