import React from 'react';

const Orb: React.FC<{ className: string }> = ({ className }) => (
  <div className={`absolute rounded-full mix-blend-lighten filter blur-2xl animate-blob ${className}`}></div>
);

export const ReportPlaceholder: React.FC = () => {
  return (
    <div className="bg-stone-900/50 border border-stone-800 p-8 rounded-xl shadow-2xl h-full flex flex-col items-center justify-center text-center overflow-hidden">
      <div className="relative w-64 h-64">
        <Orb className="w-48 h-48 bg-sky-500 opacity-60" />
        <Orb className="w-56 h-56 bg-fuchsia-500 opacity-60 animation-delay-2000 top-10 left-10" />
        <Orb className="w-40 h-40 bg-indigo-500 opacity-60 animation-delay-4000 left-20" />
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-stone-800/50 backdrop-blur-sm flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-stone-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.311a7.5 7.5 0 0 1-7.5 0c.413-.413.82-1.023 1.157-1.742a4.5 4.5 0 0 1 4.586 0c.337.719.744 1.329 1.157 1.742Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5a3.75 3.75 0 0 0-3.75 3.75v.375m3.75-.375a3.75 3.75 0 0 1 3.75 3.75v.375m-7.5 0v-.375C4.5 7.866 7.866 4.5 12 4.5v0Z" />
                </svg>
            </div>
        </div>
      </div>
      <h3 className="mt-8 text-2xl font-black text-white tracking-tight">AI 평가 보고서</h3>
      <p className="mt-2 text-stone-400 max-w-md text-sm">좌측에 공통 정보와 학생 목록을 추가하고 '일괄 생성 시작' 버튼을 클릭하면, 처리 결과가 여기에 표시됩니다.</p>
      
      <div className="mt-10 w-full max-w-2xl bg-stone-900/80 border border-stone-700/50 rounded-2xl p-6 text-left shadow-lg backdrop-blur-md">
        <h4 className="text-cyan-400 font-bold mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          상단 메뉴 가이드
        </h4>
        <ul className="space-y-3 text-sm text-stone-300">
          <li className="flex items-start"><span className="w-28 shrink-0 font-black text-sky-400">ENGINE (엔진)</span> <span>논술 답안을 분석하고 평가하는 'AI 채점 조교' 메인 화면입니다.</span></li>
          <li className="flex items-start"><span className="w-28 shrink-0 font-black text-fuchsia-400">STORE</span> <span>대학별 기출문제집, 평가 기준(Scoring Criteria)을 판매하는 상점입니다.</span></li>
          <li className="flex items-start"><span className="w-28 shrink-0 font-black text-emerald-400">내 보관함</span> <span>내가 구매하여 앱 내에서 즉시 사용 가능한 대학교 기출문제(에셋) 목록입니다.</span></li>
          <li className="flex items-start"><span className="w-28 shrink-0 font-black text-red-500">SUPER ADMIN</span> <span>개발자 및 권한이 부여된 대표 강사 전용 시스템 관리자 패널입니다.</span></li>
          <li className="flex items-start"><span className="w-28 shrink-0 font-black text-purple-400">TOKENS</span> <span>현재 [사용 가능한 토큰 수 / 누적 지급(구매)된 총 토큰 수]를 의미합니다.</span></li>
          <li className="flex items-start"><span className="w-28 shrink-0 font-black text-slate-300">GCS-SYNC</span> <span>구글 클라우드 스토리지(GCS)와 안정적으로 연동되어 있는 활성 상태 표시입니다.</span></li>
          <li className="flex items-start"><span className="w-28 shrink-0 font-black text-stone-400">로그아웃 (OUT)</span> <span>구글 계정 로그인 상태를 표시하며 언제든 'OUT' 버튼을 눌러 로그아웃할 수 있습니다.</span></li>
        </ul>
      </div>
    </div>
  );
};
