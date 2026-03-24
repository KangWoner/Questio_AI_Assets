import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle, auth, getAvailableTokens } from '../firebase';
import { ExclamationCircleIcon } from '../components/icons/ExclamationCircleIcon';

const LandingB2C: React.FC = () => {
    const navigate = useNavigate();
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleStartFreeTrial = async () => {
        setIsLoggingIn(true);
        try {
            await signInWithGoogle();
            navigate('/dashboard'); // 가입/로그인 성공 시 엔진 페이지로 이동
        } catch (error) {
            console.error('Login failed', error);
            alert('로그인에 실패했습니다. 다시 시도해 주세요.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
            
            {/* 1. HERO SECTION */}
            <section className="relative pt-32 pb-20 px-6 lg:px-20 max-w-[1400px] mx-auto flex flex-col items-center text-center">
                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/20 blur-[150px] rounded-full pointer-events-none"></div>
                <div className="absolute top-0 right-10 w-[400px] h-[400px] bg-fuchsia-600/10 blur-[120px] rounded-full pointer-events-none"></div>

                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-full mb-8 shadow-[0_0_20px_rgba(34,211,238,0.15)] animate-in slide-in-from-bottom-5 duration-700">
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                    </span>
                    <span className="text-[11px] font-black text-cyan-400 tracking-widest uppercase">2026학년도 논술/약술 최신 진단 오픈</span>
                </div>

                <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-tight mb-8 z-10 animate-in slide-in-from-bottom-8 duration-1000">
                    내 아이의 수리논술 합격, <br className="hidden md:block"/>
                    아직도 <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">강사의 '감(?)'에</span> 맡기시겠습니까?
                </h1>
                
                <p className="text-lg md:text-xl text-slate-400 font-medium max-w-2xl mb-12 z-10 leading-relaxed animate-in slide-in-from-bottom-10 duration-1000 delay-100">
                    대치동 최상위 프리미엄 컨설팅을 인공지능으로 완벽히 구현했습니다.<br/>
                    <strong className="text-white">단 3분 만에 내 아이의 치명적 약점을 분석하고 합격 가능성을 데이터로 직접 확인하세요.</strong>
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 z-10 animate-in slide-in-from-bottom-12 duration-1000 delay-200 w-full sm:w-auto">
                    <button 
                        onClick={handleStartFreeTrial}
                        disabled={isLoggingIn}
                        className="group relative w-full sm:w-auto px-10 py-5 bg-white text-black font-black text-lg rounded-full overflow-hidden hover:scale-105 transition-all shadow-[0_0_40px_rgba(34,211,238,0.3)] hover:shadow-[0_0_60px_rgba(34,211,238,0.5)]"
                    >
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-cyan-300 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <span className="relative z-10 flex items-center justify-center space-x-2 group-hover:text-white transition-colors duration-300">
                            <span>{isLoggingIn ? '잠시만 기다려주세요...' : '내 아이 실력 무료 진단하기'}</span>
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </span>
                    </button>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest sm:min-w-[120px]">
                        회원가입 즉시<br/><span className="text-cyan-400">무료 진단 1회 쿠폰 발급</span>
                    </p>
                </div>
            </section>

            {/* 2. PAIN POINT SECTION */}
            <section className="py-24 bg-slate-900/50 border-y border-slate-800/50 relative">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4">모의고사 성적은 훌륭한데,<br/>논술은 진짜 준비하고 있나요?</h2>
                        <div className="w-20 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 mx-auto rounded-full"></div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-slate-900 border border-red-500/20 rounded-[2rem] p-8 shadow-lg hover:border-red-500/40 transition-colors">
                            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-6">
                                <ExclamationCircleIcon className="w-6 h-6 text-red-400" />
                            </div>
                            <h3 className="text-xl font-black text-slate-200 mb-3">대학생 조교의 획일적이고 주관적인 단순 채점</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                대학별로 완전히 다른 채점 기준. 일개 대학생 조교가 내 아이 인생이 달린 답안지의 논리적 비약을 정확히 찾아낼 수 있을까요?
                            </p>
                        </div>
                        <div className="bg-slate-900 border border-red-500/20 rounded-[2rem] p-8 shadow-lg hover:border-red-500/40 transition-colors">
                            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-6">
                                <ExclamationCircleIcon className="w-6 h-6 text-red-400" />
                            </div>
                            <h3 className="text-xl font-black text-slate-200 mb-3">감점의 원인도 모른 채 문제만 푸는 '깜깜이' 대비</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                정답은 맞았는데 감점당하는 이유를 모른 채, 의미 없이 비싼 학원비만 내면서 기계처럼 문제만 풀고 있지는 않습니까?
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. SOLUTION SECTION (The Hook) */}
            <section className="py-32 px-6 relative overflow-hidden">
                {/* Decorative BG */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-cyan-900/20 to-fuchsia-900/10 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="max-w-[1400px] mx-auto grid lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8 relative z-10">
                        <div className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-black tracking-widest uppercase">
                            The Questio AI Solution
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tighter">
                            단 1점의 감점 요인도 <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">절대 놓치지 않습니다.</span>
                        </h2>
                        <ul className="space-y-6">
                            {[
                                "희망 대학의 공식 채점 기준 및 예시 답안 100% 딥러닝 데이터 매칭",
                                "수식 전개 과정의 논리적 오류를 잡아내는 딥러닝 분석",
                                "최상위권 전문 강사 검수 수준의 15페이지 심층 분석 리포트 즉각 발행"
                            ].map((text, i) => (
                                <li key={i} className="flex items-start">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mt-1 mr-4">
                                        <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <p className="text-slate-300 font-bold text-lg">{text}</p>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Mockup UI Image/Container */}
                    <div className="relative z-10 perspective-1000">
                        <div className="w-full h-[500px] bg-slate-800/80 border border-slate-700/50 rounded-[2rem] shadow-2xl overflow-hidden relative transform rotate-y-[-5deg] rotate-x-[5deg] transition-transform hover:rotate-y-0 hover:rotate-x-0 duration-700">
                            {/* Fake Browser Top */}
                            <div className="h-10 border-b border-white/5 bg-slate-900/50 flex items-center px-4 space-x-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                            </div>
                            {/* Fake Content (Blurry bottom) */}
                            <div className="p-8 space-y-6 bg-gradient-to-b from-slate-900 to-slate-900/90 h-full relative">
                                <div className="h-8 w-1/3 bg-cyan-500/20 rounded-lg"></div>
                                <div className="h-4 w-1/4 bg-slate-700/50 rounded"></div>
                                
                                <div className="mt-8 space-y-4">
                                    <div className="h-20 bg-slate-800/50 rounded-xl border border-slate-700/50 flex items-center px-6">
                                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex-shrink-0"></div>
                                        <div className="ml-4 space-y-2 w-full">
                                            <div className="h-3 w-3/4 bg-slate-600/50 rounded"></div>
                                            <div className="h-3 w-1/2 bg-slate-700/50 rounded"></div>
                                        </div>
                                    </div>
                                    <div className="h-20 bg-slate-800/50 rounded-xl border border-slate-700/50"></div>
                                    <div className="h-20 bg-slate-800/50 rounded-xl border border-slate-700/50"></div>
                                </div>

                                {/* Paywall Overlay on Mockup */}
                                <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-[#020617] via-[#020617]/90 to-transparent flex items-end justify-center pb-12">
                                   <div className="px-6 py-3 bg-white text-black font-black text-sm rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] animate-pulse">
                                        상세 전략 리포트 잠금 해제 (35,000원)
                                   </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. CTA FOOTER SECTION */}
            <section className="py-24 relative bg-gradient-to-b from-slate-900/0 to-cyan-950/20">
                <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                        입시의 골든 타임은 <br className="md:hidden" />지금도 흐르고 있습니다.
                    </h2>
                    <p className="text-slate-400 font-medium text-lg">
                        번거로운 정보 입력은 뺐습니다. 구글 계정으로 3초 만에 로그인하고, 즉시 무료 채점 쿠폰을 발급받아 내 아이의 상태를 점검하세요.
                    </p>
                    <button 
                        onClick={handleStartFreeTrial}
                        className="mt-8 px-12 py-5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black text-xl rounded-full hover:shadow-[0_0_40px_rgba(34,211,238,0.4)] transition-all transform hover:-translate-y-1"
                    >
                        3분 논술 무료 진단 시작하기
                    </button>
                    <p className="text-xs text-slate-500 pt-4">가입 시 15페이지 샘플 리포트를 비롯한 무료 진단용 프리 토큰이 지급됩니다.</p>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="p-10 text-center border-t border-slate-800/50 text-xs font-medium text-slate-600 bg-[#020617]">
                <p className="font-black text-slate-500 uppercase tracking-widest mb-4">Questio AI • Admisson Intelligence</p>
                <p>상호: 퀘스티오 (Questio) | 대표: 강원호 | 사업자등록번호: [입력 예정] | 통신판매업: [입력 예정]</p>
                <div className="flex justify-center space-x-6 pt-4 mt-4 w-full max-w-sm mx-auto">
                    <a href="#" className="hover:text-slate-300 transition-colors">이용약관</a>
                    <a href="#" className="hover:text-slate-300 transition-colors">개인정보처리방침</a>
                </div>
            </footer>

        </div>
    );
};

export default LandingB2C;
