import { saveToGoogleSheets } from '../services/googleSheetsService';
import React, { useState, useCallback, useEffect } from 'react';
import { InputForm } from '../components/InputForm';
import { ReportDisplay } from '../components/ReportDisplay';
import { ReportPlaceholder } from '../components/ReportPlaceholder';
import { StudentProgressView } from '../components/StudentProgressView';
import { PaywallModal } from '../components/PaywallModal';
import { AdminPanel } from '../components/AdminPanel';
import { AssetStore } from '../components/AssetStore';
import { MyLibrary } from '../components/MyLibrary';
import { isAdmin } from '../lib/admin';
import { requestEvaluationReport, searchScoringCriteria } from '../services/geminiService';
import type { FormData, ReportData, ExamDatabaseRecord, LinkedFile } from '../types';
import { initialFormData } from '../constants';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { ExclamationCircleIcon } from '../components/icons/ExclamationCircleIcon';
import { LoadingSpinnerIcon } from '../components/icons/LoadingSpinnerIcon';
import { signInWithGoogle, logOut, auth, getAvailableTokens, useToken, refundToken, getUserData } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface ReportResult {
  status: 'loading' | 'done' | 'error';
  data?: ReportData;
  error?: string;
  studentName: string;
  studentId: string;
  progressMessage?: string;
}

const B2BDashboard: React.FC = () => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [results, setResults] = useState<ReportResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [selectedStudentForProgress, setSelectedStudentForProgress] = useState<{ id: string, name: string } | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [userTokens, setUserTokens] = useState<number>(0);
  const [totalTokens, setTotalTokens] = useState<number>(0);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'store' | 'library'>('dashboard');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsAdminUser(isAdmin(currentUser.email));
        const data = await getUserData(currentUser.uid);
        if (data) {
          setUserTokens(data.freeTokens ?? 0);
          setTotalTokens(data.totalGrantedTokens ?? data.freeTokens ?? 0);
          setSubscriptionEndDate(data.subscriptionEndDate || null);
        } else {
          const avail = await getAvailableTokens(currentUser.uid);
          setUserTokens(avail);
          setTotalTokens(avail);
        }
      } else {
        setIsAdminUser(false);
      }
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error(error);
      alert('Google 로그인에 실패했습니다. 관리자에게 문의하세요.');
    }
  };

  const handleLogout = async () => {
    try {
      if (window.confirm('로그아웃 하시겠습니까?')) {
        await logOut();
      }
    } catch (e) {
      console.error(e);
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
        // 새 유형이 선택(selectedRecord)되면 기존 파일이 남아있지 않도록 완전히 교체합니다!
        problemMaterials: selectedRecord ? problemMaterials : prev.problemMaterials,
        scoringMaterials: selectedRecord ? scoringMaterials : prev.scoringMaterials
      }));

    } catch (e) {
      console.error("Search Criteria error:", e);
      alert("데이터 동기화 중 오류가 발생했습니다.");
    } finally {
      setIsSearching(false);
    }
  }, [formData.model, formData.university, formData.examYear, formData.problemType]);

  const handleGenerateReport = useCallback(async () => {
    if (isLoading || !user) return;
    setIsLoading(true);

    const studentsToProcess = formData.students;
    
    // Check tokens or subscription before processing
    const isSubscribed = subscriptionEndDate ? new Date(subscriptionEndDate) > new Date() : false;
    
    if (!isSubscribed && userTokens < studentsToProcess.length) {
      setIsPaywallOpen(true);
      setIsLoading(false);
      return;
    }

    const examInfo = `${formData.university} ${formData.examYear} ${formData.problemType}`.trim();

    setProgress({ current: 0, total: studentsToProcess.length });
    setResults(studentsToProcess.map(s => ({ studentId: s.id, studentName: s.name, status: 'loading', progressMessage: '분석 준비...' })));

    for (let i = 0; i < studentsToProcess.length; i++) {
      const student = studentsToProcess[i];
      setProgress(prev => ({ ...prev, current: i + 1 }));

      let tokenDeducted = false;
      try {
        if (!isSubscribed) {
          const tokenUsed = await useToken(user.uid);
          if (!tokenUsed) {
            setResults(prev => prev.map(r => r.studentId === student.id ? { ...r, status: 'error', error: '권한 부족', progressMessage: undefined } : r));
            continue;
          }
          tokenDeducted = true;

          // Update token UI state
          setUserTokens(prev => Math.max(0, prev - 1));
        }

        const generationDate = new Date().toLocaleString('ko-KR');
        setResults(prev => prev.map(r => r.studentId === student.id ? { ...r, progressMessage: 'AI 채점 엔진 가동...' } : r));

        const { htmlReport, rawReport, extractedData } = await requestEvaluationReport(
          { ...formData },
          { name: student.name, solutionFiles: student.solutionFiles, reportTemplate: student.reportTemplate },
          generationDate
        );

        // Background task
        saveToGoogleSheets({
          studentId: student.id, studentName: student.name, date: generationDate, examInfo: examInfo,
          ...extractedData
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
        if (tokenDeducted) {
            await refundToken(user.uid);
            setUserTokens(prev => prev + 1);
        }
        setResults(prev => prev.map(r => r.studentId === student.id ? { ...r, status: 'error', error: '분석 오류', progressMessage: undefined } : r));
      }
    }
    setIsLoading(false);
  }, [formData, isLoading]);

  const handleFormChange = (newFormData: Partial<FormData>) => setFormData(prev => ({ ...prev, ...newFormData }));

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050511]">
        <LoadingSpinnerIcon className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-transparent animate-in fade-in duration-1000">
        <div className="w-full max-w-xl space-y-12 text-center">
          <div className="space-y-4">
            <div className="inline-block px-4 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-full text-blue-400 text-[10px] font-black tracking-widest uppercase mb-4 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              Questio AI Business Engine
            </div>
            <h1 className="text-7xl font-black tracking-tighter text-white uppercase italic drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              Questio <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 blur-[0.3px]">AI</span>
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-tight text-xs">학원 맞춤형 수리논술 AI 채점 및 콘텐츠 관리 플랫폼</p>
          </div>

          <div className="glass-panel p-10 rounded-[3rem] space-y-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            
            <div className="relative z-10 bg-gradient-to-r from-cyan-500/10 to-fuchsia-500/20 border border-fuchsia-500/30 rounded-2xl p-5 mb-2 shadow-[0_0_20px_rgba(217,70,239,0.15)] transform transition-transform hover:scale-[1.02]">
              <span className="inline-block px-2 py-0.5 bg-fuchsia-500 text-white text-[10px] font-black tracking-widest uppercase rounded mb-2 animate-pulse">Event</span>
              <p className="text-sm font-bold text-slate-200 leading-relaxed">
                B2B 원장님 전용 가입 혜택: <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 font-black text-base">2026학년도 주요 대학 논술/약술 기출 분석 및 채점 기준 데이터(CSV) 샘플 즉시 제공!</span>
              </p>
            </div>

            <div className="space-y-3 relative z-10 flex flex-col items-center mt-4">
              <label className="text-[12px] font-black text-slate-300 uppercase tracking-widest block text-center mb-4">서비스 시작하기</label>
              <button
                onClick={handleLogin}
                className="w-full max-w-md py-5 bg-white text-black font-black text-lg rounded-3xl hover:bg-stone-200 transition-all shadow-2xl shadow-sky-500/20 uppercase flex items-center justify-center space-x-3"
              >
                <svg className="w-6 h-6" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M47.532 24.5528C47.532 22.9214 47.3997 21.2811 47.1175 19.6761H24.48V28.9181H37.4434C36.9055 31.8988 35.177 34.5356 32.6461 36.2111V42.2078H40.3801C44.9217 38.0278 47.532 31.8547 47.532 24.5528Z" fill="#4285F4" />
                  <path d="M24.48 48.0016C30.9529 48.0016 36.4116 45.8764 40.3888 42.2078L32.6549 36.2111C30.5031 37.675 27.7252 38.5039 24.4888 38.5039C18.2275 38.5039 12.9187 34.2798 11.0139 28.6006H3.03296V34.7825C7.10718 42.8868 15.4056 48.0016 24.48 48.0016Z" fill="#34A853" />
                  <path d="M11.0051 28.6006C9.99973 25.6199 9.99973 22.3922 11.0051 19.4115V13.2296H3.02419C-0.805047 20.8496 -0.805047 27.1625 3.02419 34.7825L11.0051 28.6006Z" fill="#FBBC04" />
                  <path d="M24.48 9.49932C27.9016 9.4446 31.2086 10.7339 33.6869 13.0973L40.5387 6.24553C36.2 2.17101 30.4418 -0.068932 24.48 0.00161733C15.4056 0.00161733 7.10718 5.11644 3.03296 13.2208L11.0139 19.4027C12.8923 13.7235 18.2187 9.49932 24.48 9.49932Z" fill="#EA4335" />
                </svg>
                <span>Google 계정으로 로그인</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">기관/학원 회원은 가입 후 관리자 승인을 통해 Pro 버전을 체험하실 수 있습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full font-sans flex flex-col bg-transparent text-slate-200 animate-in fade-in duration-500">
      <header className="sticky top-0 z-10 glass-panel border-b-0 border-[rgba(255,255,255,0.05)] shadow-lg">
        <div className="container mx-auto px-10 py-6 flex justify-between items-center max-w-[1600px]">
          <div className="flex items-center space-x-4">
            <button onClick={() => setCurrentTab('dashboard')} title="홈으로" className="text-2xl font-black tracking-tighter group uppercase italic drop-shadow-md cursor-pointer">
              Questio <span className="text-cyan-400 group-hover:text-fuchsia-400 transition-colors drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">AI</span>
            </button>
            <div className="h-4 w-[1px] bg-slate-700 mx-2 hidden md:block"></div>
            
            {/* TAB Navigation */}
            <div className="hidden md:flex space-x-2 bg-slate-900/50 p-1 rounded-xl border border-white/5">
              <button 
                onClick={() => setCurrentTab('dashboard')} 
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${currentTab === 'dashboard' ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-slate-400 hover:text-white'}`}
              >Engine</button>
              <button 
                onClick={() => setCurrentTab('store')} 
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${currentTab === 'store' ? 'bg-fuchsia-500/20 text-fuchsia-400 shadow-[0_0_10px_rgba(217,70,239,0.2)]' : 'text-slate-400 hover:text-white'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                <span>Store</span>
              </button>
              <button 
                onClick={() => setCurrentTab('library')} 
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${currentTab === 'library' ? 'bg-yellow-500/20 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'text-slate-400 hover:text-white'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                <span>내 보관함</span>
              </button>
            </div>

            <div className="h-4 w-[1px] bg-slate-700 mx-2 hidden lg:block"></div>
            <span className="text-[10px] font-black text-slate-400 tracking-widest hidden lg:block">
              {user.displayName || user.email}
            </span>
          </div>
          <div className="flex items-center space-x-6">
            {isAdminUser && (
              <button
                onClick={() => setIsAdminPanelOpen(true)}
                className="bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500/40 hover:text-white transition-all shadow-lg shadow-red-500/20"
              >
                Super Admin
              </button>
            )}
            <div className="hidden md:flex flex-col items-center justify-center bg-fuchsia-900/40 border border-fuchsia-700/50 px-5 py-2 rounded-2xl backdrop-blur-sm mr-2 shadow-[0_0_15px_rgba(217,70,239,0.2)]">
              {subscriptionEndDate && new Date(subscriptionEndDate) > new Date() ? (
                <span className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest whitespace-pre drop-shadow-md">Pro 구독 중 <span className="text-white text-[9px] opacity-80">(~{new Date(subscriptionEndDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric'})})</span></span>
              ) : (
                <span className="text-[10px] font-black text-fuchsia-300 uppercase tracking-widest whitespace-pre">Tokens: <span className="text-white text-xs">{userTokens}</span> / {totalTokens}</span>
              )}
            </div>
            <div className="hidden md:flex items-center bg-slate-900/40 border border-slate-700/50 px-5 py-2 rounded-2xl backdrop-blur-sm">
              <div className="w-2 h-2 bg-cyan-400 rounded-full mr-3 shadow-[0_0_8px_rgba(34,211,238,0.9)] animate-pulse"></div>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">GCS-Sync: ACTIVE</span>
            </div>
            <button
              onClick={handleLogout}
              className="w-10 h-10 rounded-2xl bg-stone-800/60 border border-stone-600/50 flex items-center justify-center font-black text-stone-300 shadow-[0_0_15px_rgba(0,0,0,0.3)] hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 transition-all text-xs"
            >
              OUT
            </button>
          </div>
        </div>
      </header>
      
      {currentTab === 'dashboard' ? (
        <main className="container mx-auto p-10 grid grid-cols-1 xl:grid-cols-12 gap-12 flex-grow items-start max-w-[1600px]">
          <div className="xl:col-span-5 lg:sticky top-36">
            <InputForm
              formData={formData}
              onFormChange={handleFormChange}
              onGenerate={handleGenerateReport}
            onSearchCriteria={handleSearchCriteria}
            onGoToLibrary={() => setCurrentTab('library')}
            isLoading={isLoading}
            isSearching={isSearching}
          />
        </div>
        <div className="xl:col-span-7 space-y-10">
          {results.length === 0 ? <ReportPlaceholder /> : (
            <div className="glass-panel rounded-[4rem] overflow-hidden">
              <div className="p-12 border-b border-white/5 bg-slate-900/30 flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tighter uppercase drop-shadow-sm">Questio Analysis Panel</h2>
                  <p className="text-xs text-cyan-400 font-bold mt-2 uppercase tracking-widest shadow-cyan-500/50">Processing batch job for {formData.students.length} candidates</p>
                </div>
                <div className="px-6 py-2 bg-cyan-500/20 rounded-2xl border border-cyan-400/40 text-xs font-black text-cyan-300 uppercase tracking-widest shadow-[0_0_10px_rgba(34,211,238,0.3)]">
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
                        {r.status === 'done' && <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedStudentForProgress({ id: r.studentId, name: r.studentName }); }} className="px-6 py-3 bg-sky-600 text-white font-black text-[11px] rounded-2xl hover:bg-sky-500 transition-all shadow-xl shadow-sky-900/30 uppercase tracking-widest cursor-pointer">Growth Matrix</div>}
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
      ) : currentTab === 'store' ? (
        <main className="container mx-auto p-10 flex-grow max-w-[1600px] w-full">
          <AssetStore onGoToLibrary={() => setCurrentTab('library')} isAdminUser={isAdminUser} />
        </main>
      ) : (
        <main className="container mx-auto p-10 flex-grow max-w-[1600px] w-full">
          <MyLibrary onGoToEngine={(record) => {
              setCurrentTab('dashboard');
              if (record) {
                  const isSimple = record.problemType && record.problemType.includes('약술');
                  handleFormChange({ 
                      category: isSimple ? 'short-answer' : 'essay',
                      university: record.university,
                      examYear: '',
                      problemType: '',
                      scoringCriteria: '',
                      problemMaterials: [],
                      scoringMaterials: []
                  });
              }
          }} />
        </main>
      )}


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
              <button onClick={() => setSelectedStudentForProgress(null)} title="닫기" aria-label="닫기" className="w-16 h-16 rounded-[1.5rem] bg-stone-800 text-stone-500 hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center transition-all border border-stone-700/50">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-16 overflow-y-auto bg-stone-950/30 scrollbar-thin">
              <StudentProgressView studentId={selectedStudentForProgress.id} studentName={selectedStudentForProgress.name} />
            </div>
          </div>
        </div>
      )}

      <footer className="p-12 text-center border-t border-stone-900/50 text-[11px] font-medium text-stone-500 space-y-2 relative z-10 bg-black">
        <p className="font-black text-stone-700 uppercase tracking-[0.5em] mb-4">Project Questio • Secure GCS Asset Storage Engine v2.0</p>
        <p>상호: 퀘스티오 (Questio) | 대표: 강원호 | 사업자등록번호: [추후 입력 요망] | 통신판매업신고: [추후 입력 요망]</p>
        <p>주소: [사업장 주소 입력 요망]</p>
        <p>고객센터: [전화번호/이메일 입력 요망] | 호스팅 제공자: Google LLC</p>
        <div className="flex justify-center space-x-6 pt-4 mt-4 border-t border-stone-800/50 w-full max-w-sm mx-auto">
          <a href="#" className="hover:text-stone-300 transition-colors underline">이용약관</a>
          <a href="#" className="hover:text-stone-300 transition-colors underline font-bold">개인정보처리방침</a>
        </div>
      </footer>

      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
      />

      <AdminPanel
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
      />
    </div>
  );
};

export default B2BDashboard;
