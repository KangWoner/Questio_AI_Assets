import React from 'react';

export const PaymentFail: React.FC = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message') || '알 수 없는 이유로 결제가 실패했습니다.';
    const code = urlParams.get('code') || 'ERROR';

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050511] p-6 text-center animate-in fade-in duration-500">
            <div className="glass-panel max-w-lg w-full p-12 rounded-[3rem] space-y-6">
                <div className="w-20 h-20 bg-rose-500/20 text-rose-400 rounded-full mx-auto flex items-center justify-center border border-rose-500/50">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-3xl font-black text-white mb-2 tracking-tight">결제가 취소되었거나 실패했습니다</h2>
                    <p className="text-rose-400/80 text-sm mb-1">{message}</p>
                    <p className="text-slate-500 text-xs font-mono">Error Code: {code}</p>
                </div>
                <button
                    onClick={() => window.location.href = '/'}
                    className="w-full py-4 bg-slate-800 text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-colors"
                >
                    홈으로 돌아가기
                </button>
            </div>
        </div>
    );
};
