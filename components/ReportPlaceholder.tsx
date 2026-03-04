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
      <h3 className="mt-8 text-xl font-bold text-stone-200">AI 평가 보고서</h3>
      <p className="mt-2 text-stone-400 max-w-sm">좌측에 공통 정보와 학생 목록을 추가하고 '일괄 생성 시작' 버튼을 클릭하면, 처리 결과가 여기에 표시됩니다.</p>
    </div>
  );
};
