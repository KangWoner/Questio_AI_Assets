
import { saveToGoogleSheets } from './services/googleSheetsService';
import React, { useState, useCallback } from 'react';
import { InputForm } from './components/InputForm';
import { ReportDisplay } from './components/ReportDisplay';
import { ReportPlaceholder } from './components/ReportPlaceholder';
import { StudentProgressView } from './components/StudentProgressView';
import { gradeSolutionAndGenerateFeedback, formatReportToHtml, searchScoringCriteria, extractReportData } from './services/geminiService';
import type { FormData, ReportData, ExamDatabaseRecord, LinkedFile } from './types';
import { initialFormData } from './constants';
import { CheckCircleIcon } from './components/icons/CheckCircleIcon';
import { ExclamationCircleIcon } from './components/icons/ExclamationCircleIcon';
import { LoadingSpinnerIcon } from './components/icons/LoadingSpinnerIcon';

interface ReportResult {
  status: 'loading' | 'done' | 'error';
  data?: ReportData;
  error?: string;
  studentName: string;
  studentId: string;
  progressMessage?: string;
}

const App: React.FC = () => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [results, setResults] = useState<ReportResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [selectedStudentForProgress, setSelectedStudentForProgress] = useState<{ id: string, name: string } | null>(null);
  
  const [isStarted, setIsStarted] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  const verifyLicense = () => {
    if (licenseKey === 'questio') {
      setIsVerified(true);
      setIsStarted(true);
      alert('Questio 프로젝트: 프리미엄 GCS 인프라가 활성화되었습니다.');
    } else if (licenseKey === 'GUEST') {
      setIsVerified(false);
      setIsStarted(true);
    } else {
      alert('유효하지 않은 인증 코드입니다.');
    }
  };

  const handleSearchCriteria = useCallback(async (selectedRecord?: ExamDatabaseRecord) => {
    setIsSearching(true);
    const targetUniv = selectedRecord?.university || formData.university;
    const targetYear = selectedRecord?.year || formData.examYear;
    const targetType = selectedRecord?.problemType || formData.problemType;

    try {
      const problemMaterials: LinkedFile[] = [];
      const scoringMaterials: LinkedFile[] = [];

      if (selectedRecord) {
        if (selectedRecord.problemUrl) {
          problemMaterials.push({ 
            name: `${selectedRecord.problemType} 문제 (GCS)`, 
            url: selectedRecord.problemUrl 
          });
        }
        if (selectedRecord.solutionUrl) {
          scoringMaterials.push({ 
            name: `${selectedRecord.problemType} 해설 (GCS)`, 
            url: selectedRecord.solutionUrl 
          });
        }
      }

      const criteria = await searchScoringCriteria(targetUniv, targetYear, targetType, formData.model);
      
      setFormData(prev => ({ 
        ...prev, 
        university: targetUniv,
        examYear: targetYear,
        problemType: targetType,
        scoringCriteria: criteria,
        problemMaterials: problemMaterials.length > 0 ? [...problemMaterials] : prev.problemMaterials,
        scoringMaterials: scoringMaterials.length > 0 ? [...scoringMaterials] : prev.scoringMaterials
      }));

    } catch (e) {
      console.error("Search Criteria error:", e);
      alert("데이터 동기화 중 오류가 발생했습니다.");
    } finally {
      setIsSearching(false);
    }
  }, [formData.model, formData.university, formData.examYear, formData.problemType]);

  const handleGenerateReport = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    
    const studentsToProcess = formData.students;
    const examInfo = `${formData.university} ${formData.examYear} ${formData.problemType}`.trim();

    setProgress({ current: 0, total: studentsToProcess.length });
    setResults(studentsToProcess.map(s => ({ studentId: s.id, studentName: s.name, status: 'loading', progressMessage: '분석 준비...' })));

    for (let i = 0; i < studentsToProcess.length; i++) {
      const student = studentsToProcess[i];
      setProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        const generationDate = new Date().toLocaleString('ko-KR');
        setResults(prev => prev.map(r => r.studentId === student.id ? { ...r, progressMessage: 'AI 채점 엔진 가동...' } : r));

        const rawReport = await gradeSolutionAndGenerateFeedback(
          { ...formData },
          { name: student.name, solutionFiles: student.solutionFiles, reportTemplate: student.reportTemplate }
        );

        const htmlReport = await formatReportToHtml(
          rawReport,
          { ...formData },
          student.name,
          generationDate
        );

        const extracted = await extractReportData(rawReport, formData.model);
        
        // Background task
        saveToGoogleSheets({
          studentId: student.id, studentName: student.name, date: generationDate, examInfo: examInfo,
          ...extracted
        }).catch(err => console.error("Sheets save failed", err));

        const reportData: ReportData = {
          htmlContent: htmlReport,
          studentEmail: student.email,
          studentName: student.name,
          examInfo: examInfo,
          generationDate
        };

        setResults(prev => prev.map(r => r.studentId === student.id ? { ...r, status: 'done', data: reportData, progressMessage: undefined } : r));
      } catch (e) {
        console.error(`Error processing student ${student.name}:`, e);
        setResults(prev => prev.map(r => r.studentId === student.id ? { ...r, status: 'error', error: '분석 오류', progressMessage: undefined } : r));
      }
    }
    setIsLoading(false);
  }, [formData, isLoading]);

  const handleFormChange = (newFormData: Partial<FormData>) => setFormData(prev => ({ ...prev, ...newFormData }));

  if (!isStarted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#0c0a09] animate-in fade-in duration-1000">
        <div className="w-full max-w-xl space-y-12 text-center">
          <div className="space-y-4">
             <div className="inline-block px-4 py-1 bg-sky-500/10 border border-sky-500/20 rounded-full text-sky-400 text-[10px] font-black tracking-widest uppercase mb-4">
                Questio Project Asset Engine
             </div>
             <h1 className="text-7xl font-black tracking-tighter text-white uppercase italic">
               Questio <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500">AI</span>
             </h1>
             <p className="text-stone-500 font-bold uppercase tracking-tight text-xs">Cloud Native Exam Asset Management & Analysis</p>
          </div>

          <div className="bg-stone-900 border border-stone-800 p-10 rounded-[3rem] shadow-4xl space-y-8">
             <div className="space-y-3">
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest block text-left ml-4">Service Access Key</label>
                <input 
                  type="password"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="ENTER ACCESS CODE"
                  className="w-full px-8 py-5 bg-stone-950 border border-stone-800 rounded-3xl text-white outline-none focus:border-sky-500/50 transition-all text-center tracking-widest font-black"
                  onKeyDown={(e) => e.key === 'Enter' && verifyLicense()}
                />
             </div>
             <button 
                onClick={verifyLicense}
                className="w-full py-5 bg-white text-black font-black text-lg rounded-3xl hover:bg-stone-200 transition-all shadow-2xl shadow-white/5 uppercase"
             >
                Connect to Questio-Storage
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full font-sans flex flex-col bg-[#0c0a09] text-stone-300 animate-in fade-in duration-500">
      <header className="sticky top-0 z-10 bg-[#0c0a09]/80 backdrop-blur-3xl border-b border-stone-800/40">
        <div className="container mx-auto px-10 py-6 flex justify-between items-center max-w-[1600px]">
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsStarted(false)} className="text-2xl font-black tracking-tighter group uppercase italic">
              Questio <span className="text-sky-500 group-hover:text-sky-400 transition-colors">AI</span>
            </button>
            <div className="h-4 w-[1px] bg-stone-800 mx-2"></div>
            <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">
              {isVerified ? 'Project Questio: GCS Connected' : 'Guest Mode'}
            </span>
          </div>
          <div className="flex items-center space-x-6">
             <div className="hidden md:flex items-center bg-stone-900 border border-stone-800 px-5 py-2 rounded-2xl">
                <div className="w-2 h-2 bg-sky-500 rounded-full mr-3 shadow-[0_0_8px_rgba(14,165,233,0.8)]"></div>
                <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest">GCS-Sync: {formData.category === 'essay' ? 'questio-assets-storage' : 'questi0-assets-simple'}</span>
             </div>
             <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-stone-800 to-stone-900 border border-stone-700 flex items-center justify-center font-black text-sky-500 shadow-inner">
                {isVerified ? 'P26' : 'GT'}
             </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-10 grid grid-cols-1 xl:grid-cols-12 gap-12 flex-grow items-start max-w-[1600px]">
        <div className="xl:col-span-5 lg:sticky top-36">
          <InputForm
            formData={formData}
            onFormChange={handleFormChange}
            onGenerate={handleGenerateReport}
            onSearchCriteria={handleSearchCriteria}
            isLoading={isLoading}
            isSearching={isSearching}
          />
        </div>
        <div className="xl:col-span-7 space-y-10">
          {results.length === 0 ? <ReportPlaceholder /> : (
            <div className="bg-stone-900/40 border border-stone-800/50 rounded-[4rem] shadow-4xl overflow-hidden backdrop-blur-3xl">
              <div className="p-12 border-b border-stone-800/50 bg-stone-900/60 flex justify-between items-end">
                <div>
                   <h2 className="text-3xl font-black text-stone-100 tracking-tighter uppercase">Questio Analysis Panel</h2>
                   <p className="text-xs text-stone-500 font-bold mt-2 uppercase tracking-widest tracking-tighter">Processing batch job for {formData.students.length} candidates</p>
                </div>
                <div className="px-6 py-2 bg-sky-500/10 rounded-2xl border border-sky-500/20 text-xs font-black text-sky-400 uppercase tracking-widest">
                  {progress.current} / {progress.total} READY
                </div>
              </div>
              <div className="p-10 space-y-8">
                {results.map(r => (
                  <details key={r.studentId} className="bg-stone-900/80 border border-stone-800/40 rounded-[2.5rem] overflow-hidden group transition-all" open={r.status !== 'loading'}>
                    <summary className="p-8 flex justify-between items-center cursor-pointer hover:bg-stone-800/30 transition-all list-none select-none">
                      <div className="flex items-center space-x-6">
                        <div className="w-16 h-16 rounded-3xl bg-stone-950 border border-stone-800 flex items-center justify-center font-black text-stone-400 text-2xl group-open:text-sky-400 group-open:border-sky-500/20 transition-all shadow-inner">
                          {r.studentName.slice(0, 1)}
                        </div>
                        <div>
                          <p className="font-black text-stone-100 text-xl tracking-tight">{r.studentName}</p>
                          <p className="text-[10px] text-stone-600 uppercase font-black tracking-[0.2em] mt-1">{r.status === 'done' ? 'Intelligence Report Ready' : 'Analyzing Logic'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                         {r.status === 'done' && <button onClick={(e) => { e.stopPropagation(); setSelectedStudentForProgress({id: r.studentId, name: r.studentName}); }} className="px-6 py-3 bg-sky-600 text-white font-black text-[11px] rounded-2xl hover:bg-sky-500 transition-all shadow-xl shadow-sky-900/30 uppercase tracking-widest">Growth Matrix</button>}
                         {r.status === 'loading' ? (
                            <div className="flex items-center space-x-4 px-5 py-2.5 bg-stone-950/80 rounded-2xl border border-stone-800">
                              <LoadingSpinnerIcon className="w-4 h-4 text-sky-500 animate-spin" />
                              <span className="text-[10px] text-sky-400 font-black uppercase tracking-widest animate-pulse">{r.progressMessage}</span>
                            </div>
                         ) : 
                          r.status === 'done' ? <CheckCircleIcon className="w-10 h-10 text-green-500" /> : <ExclamationCircleIcon className="w-10 h-10 text-red-500" />}
                      </div>
                    </summary>
                    <div className="border-t border-stone-800/40 bg-stone-950/40">
                      {r.status === 'done' && r.data && <ReportDisplay reportData={r.data} />}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      
      {selectedStudentForProgress && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-50 flex items-center justify-center p-12 animate-in fade-in zoom-in duration-300">
           <div className="bg-stone-900 border border-stone-800 w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-[4rem] shadow-4xl flex flex-col">
              <div className="p-12 border-b border-stone-800/80 flex justify-between items-center bg-stone-900/50">
                 <div className="flex items-center space-x-8">
                    <div className="w-20 h-20 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-[2rem] flex items-center justify-center text-4xl font-black text-white shadow-2xl">
                      {selectedStudentForProgress.name.slice(0, 1)}
                    </div>
                    <div>
                      <h2 className="text-4xl font-black text-stone-100 tracking-tighter">{selectedStudentForProgress.name} Performance Intelligence</h2>
                      <p className="text-xs text-stone-500 font-black uppercase tracking-[0.3em] mt-2">Cloud-Based Logic Analytics</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedStudentForProgress(null)} className="w-16 h-16 rounded-[1.5rem] bg-stone-800 text-stone-500 hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center transition-all border border-stone-700/50">
                   <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
              <div className="p-16 overflow-y-auto bg-stone-950/30 scrollbar-thin">
                 <StudentProgressView studentId={selectedStudentForProgress.id} studentName={selectedStudentForProgress.name} />
              </div>
           </div>
        </div>
      )}

      <footer className="p-12 text-center border-t border-stone-900/50 text-[10px] font-black text-stone-700 uppercase tracking-[0.5em]">
         Project Questio • Secure GCS Asset Storage Engine v2.0
      </footer>
    </div>
  );
};

export default App;
