import React, { useEffect, useState } from 'react';

export const PaymentSuccess: React.FC = () => {
    const [status, setStatus] = useState<'loading' | 'success' | 'fail'>('loading');
    const [message, setMessage] = useState('결제를 승인하는 중입니다...');

    useEffect(() => {
        const confirmPayment = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const paymentKey = urlParams.get('paymentKey');
                const orderId = urlParams.get('orderId');
                const amount = urlParams.get('amount');

                if (!paymentKey || !orderId || !amount) {
                    throw new Error('결제 정보가 부족합니다.');
                }

                // Get current user for token update
                const { auth } = await import('../firebase');
                const currentUser = auth.currentUser;

                const response = await fetch('/api/confirmPayment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        paymentKey,
                        orderId,
                        amount: Number(amount),
                        uid: currentUser ? currentUser.uid : null
                    }),
                });

                if (response.ok) {
                    setStatus('success');
                    setMessage('결제가 성공적으로 완료되었습니다! 이제 서비스를 자유롭게 이용하실 수 있습니다.');
                } else {
                    const data = await response.json();
                    throw new Error(data.message || '결제 승인에 실패했습니다.');
                }
            } catch (err: any) {
                console.error(err);
                setStatus('fail');
                setMessage(err.message || '승인 중 오류가 발생했습니다.');
            }
        };

        confirmPayment();
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050511] p-6 text-center animate-in fade-in duration-500">
            <div className="glass-panel max-w-lg w-full p-12 rounded-[3rem] space-y-6">
                {status === 'loading' && (
                    <div className="space-y-4">
                        <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto"></div>
                        <h2 className="text-2xl font-black text-white">결제 처리 중...</h2>
                        <p className="text-slate-400 text-sm">{message}</p>
                    </div>
                )}
                {status === 'success' && (
                    <div className="space-y-6">
                        <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full mx-auto flex items-center justify-center border border-green-500/50">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white mb-2">결제 성공!</h2>
                            <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
                        </div>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black text-sm uppercase tracking-widest rounded-xl hover:opacity-90 transition-opacity"
                        >
                            서비스로 돌아가기
                        </button>
                    </div>
                )}
                {status === 'fail' && (
                    <div className="space-y-6">
                        <div className="w-20 h-20 bg-red-500/20 text-red-400 rounded-full mx-auto flex items-center justify-center border border-red-500/50">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white mb-2">결제 실패</h2>
                            <p className="text-red-400/80 text-sm leading-relaxed">{message}</p>
                        </div>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="w-full py-4 bg-slate-800 text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-colors"
                        >
                            처음으로 돌아가기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
