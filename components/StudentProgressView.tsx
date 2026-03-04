
import React, { useState, useEffect } from 'react';
import type { StudentHistory, StudentRecord } from '../types';
import { getFromGoogleSheets } from '../services/googleSheetsService';
import { LoadingSpinnerIcon } from './icons/LoadingSpinnerIcon';
import { CompetencyChart } from './CompetencyChart';

interface StudentProgressViewProps {
  studentId: string;
  studentName: string;
}

export const StudentProgressView: React.FC<StudentProgressViewProps> = ({ studentId, studentName }) => {
  const [history, setHistory] = useState<StudentHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'competency' | 'weakness'>('overview');

  useEffect(() => {
    const syncData = async () => {
      setLoading(true);
      try {
        // 1. Google Sheets(클라우드)에서 데이터 가져오기 시도
        const cloudRecords = await getFromGoogleSheets(studentId);
        
        // 2. 로컬 데이터 가져오기 (백업용)
        const storageKey = `student_history_${studentId}`;
        const localDataRaw = localStorage.getItem(storageKey);
        const localHistory: StudentHistory | null = localDataRaw ? JSON.parse(localDataRaw) : null;

        // 3. 데이터 병합 및 상태 설정
        // 클라우드에 데이터가 있으면 클라우드 우선, 없으면 로컬 사용
        if (cloudRecords && cloudRecords.length > 0) {
          // 클라우드 데이터 형식에 맞춰 변환 (SheetRecord -> StudentRecord)
          // Added criteriaScores to fix TypeScript missing property error
          const formattedRecords: StudentRecord[] = cloudRecords.map((r: any) => ({
            id: r.id || crypto.randomUUID(),
            date: r.date,
            examInfo: r.examInfo,
            totalScore: Number(r.totalScore),
            maxScore: Number(r.maxScore),
            weaknesses: r.weaknesses || [],
            strengths: r.strengths || [],
            conceptWeaknesses: r.conceptWeaknesses || [],
            coreCompetencies: r.coreCompetencies || { problemSolving: 50, writingAbility: 50, calculationAccuracy: 50 },
            criteriaScores: r.criteriaScores || []
          }));

          setHistory({
            studentId,
            studentName,
            studentEmail: '',
            records: formattedRecords
          });
        } else if (localHistory) {
          setHistory(localHistory);
        }
      } catch (error) {
        console.error("데이터 동기화 중 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    syncData();
  }, [studentId, studentName]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <LoadingSpinnerIcon className="w-10 h-10 text-sky-500 animate-spin" />
        <p className="text-stone-500 text-xs font-black uppercase tracking-widest">Cloud Syncing...</p>
      </div>
    );
  }

  if (!history || history.records.length === 0) {
    return (
      <div className="bg-stone-900/50 border border-stone-800 rounded-3xl p-12 text-center">
        <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <p className="text-stone-400 font-bold">아직 누적된 데이터가 없습니다.</p>
        <p className="text-stone-600 text-[10px] mt-2 uppercase tracking-tight">First grade a student to see the trend</p>
      </div>
    );
  }

  const records = history.records;
  const latest = records[records.length - 1];
  const previous = records.length > 1 ? records[records.length - 2] : null;
  const scoreChange = previous 
    ? ((latest.totalScore / latest.maxScore) - (previous.totalScore / previous.maxScore)) * 100 
    : 0;

  // 개념별 약점 누적 분석
  const conceptStats: { [key: string]: { concept: string; category: string; totalCount: number; allDetails: string[] } } = {};
  
  records.forEach(record => {
    if (record.conceptWeaknesses) {
      record.conceptWeaknesses.forEach(cw => {
        const key = `${cw.concept}-${cw.category}`;
        if (!conceptStats[key]) {
          conceptStats[key] = {
            concept: cw.concept,
            category: cw.category,
            totalCount: 0,
            allDetails: [],
          };
        }
        conceptStats[key].totalCount += cw.count;
        conceptStats[key].allDetails.push(...cw.details);
      });
    }
  });

  const sortedConceptStats = Object.values(conceptStats).sort((a, b) => b.totalCount - a.totalCount);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case '계산실수': return 'bg-yellow-500/20 border-yellow-600 text-yellow-300';
      case '개념이해': return 'bg-red-500/20 border-red-600 text-red-300';
      case '논리전개': return 'bg-purple-500/20 border-purple-600 text-purple-300';
      case '문제이해': return 'bg-orange-500/20 border-orange-600 text-orange-300';
      case '표현력': return 'bg-blue-500/20 border-blue-600 text-blue-300';
      default: return 'bg-stone-500/20 border-stone-600 text-stone-300';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 탭 메뉴 */}
      <div className="flex gap-4 border-b border-stone-800 pb-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'overview'
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-900/40'
              : 'text-stone-500 hover:text-stone-300'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('competency')}
          className={`px-6 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'competency'
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-900/40'
              : 'text-stone-500 hover:text-stone-300'
          }`}
        >
          Competency
        </button>
        <button
          onClick={() => setActiveTab('weakness')}
          className={`px-6 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'weakness'
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-900/40'
              : 'text-stone-500 hover:text-stone-300'
          }`}
        >
          Weakness
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* 요약 카드 섹션 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-stone-900 border border-stone-800 p-6 rounded-[2rem] shadow-inner">
              <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">Current Score</p>
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl font-black text-stone-100">{latest.totalScore}</span>
                <span className="text-stone-500 font-bold">/ {latest.maxScore}</span>
              </div>
            </div>
            
            <div className="bg-stone-900 border border-stone-800 p-6 rounded-[2rem] shadow-inner">
              <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">Growth Rate</p>
              <div className="flex items-center space-x-2">
                <span className={`text-3xl font-black ${scoreChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {scoreChange >= 0 ? '+' : ''}{scoreChange.toFixed(1)}%
                </span>
                <div className={`p-1 rounded-lg ${scoreChange >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                   <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ${scoreChange >= 0 ? 'text-green-500' : 'text-red-500'} ${scoreChange < 0 ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                </div>
              </div>
            </div>

            <div className="bg-stone-900 border border-stone-800 p-6 rounded-[2rem] shadow-inner">
              <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">Total Evaluations</p>
              <div className="flex items-center space-x-3">
                <span className="text-3xl font-black text-sky-400">{records.length}</span>
                <span className="text-stone-500 font-bold uppercase text-[10px]">Sessions</span>
              </div>
            </div>
          </div>

          {/* 점수 변화 그래프 (심플 바) */}
          <div className="bg-stone-900 border border-stone-800 p-8 rounded-[2.5rem] shadow-inner">
            <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-8 text-center">Score Evolution History</h4>
            <div className="flex items-end justify-between gap-4 h-48 px-4">
              {records.slice(-8).map((record, i) => {
                const height = (record.totalScore / record.maxScore) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center group">
                    <div className="relative w-full flex justify-center items-end h-full">
                      <div 
                        className="w-full max-w-[40px] bg-gradient-to-t from-sky-600 to-indigo-500 rounded-2xl transition-all duration-1000 group-hover:from-sky-400 group-hover:to-indigo-400 shadow-lg shadow-sky-900/20"
                        style={{ height: `${height}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-stone-800 text-white text-[9px] font-black px-2 py-1 rounded shadow-xl whitespace-nowrap z-10">
                          {record.totalScore} PTS
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 text-[9px] font-bold text-stone-600 group-hover:text-stone-400 transition-colors truncate w-full text-center">
                      {record.examInfo.split(' ')[0]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 상세 기록 리스트 */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-4">Detailed Session Records</h4>
            <div className="grid grid-cols-1 gap-3">
              {records.slice().reverse().map((record) => (
                <div key={record.id} className="flex items-center justify-between bg-stone-900/40 border border-stone-800 p-5 rounded-[1.5rem] hover:border-stone-700 transition-all">
                  <div className="flex items-center space-x-5">
                    <div className="w-10 h-10 bg-stone-800 rounded-2xl flex items-center justify-center text-stone-500 font-black text-xs">
                      {record.date.split('.')[1]}.{record.date.split('.')[2]}
                    </div>
                    <div>
                      <p className="font-bold text-stone-200 text-sm">{record.examInfo}</p>
                      <p className="text-[10px] text-stone-600 font-bold uppercase tracking-tight">{record.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <p className="text-sm font-black text-stone-100">{record.totalScore} / {record.maxScore}</p>
                      <div className="w-20 h-1 bg-stone-800 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-sky-500" style={{ width: `${(record.totalScore/record.maxScore)*100}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'competency' && (
        <div className="bg-stone-900 border border-stone-800 p-8 rounded-[2.5rem] shadow-inner">
          <CompetencyChart records={records} />
        </div>
      )}

      {activeTab === 'weakness' && (
        <div className="space-y-6">
          {sortedConceptStats.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {sortedConceptStats.slice(0, 8).map((stat, idx) => (
                <div 
                  key={idx}
                  className={`border rounded-[2rem] p-6 flex justify-between items-center ${getCategoryColor(stat.category)}`}
                >
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className="font-black text-lg">{stat.concept}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60 px-2 py-0.5 border border-current rounded-full">{stat.category}</span>
                    </div>
                    {stat.allDetails.length > 0 && (
                      <p className="mt-2 text-xs opacity-80 font-medium">
                        최근 이슈: {stat.allDetails[stat.allDetails.length - 1]}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black">{stat.totalCount}</span>
                    <span className="text-[10px] font-black uppercase ml-1 opacity-60">Occurrences</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-stone-900/50 border border-stone-800 rounded-[2rem] p-12 text-center">
              <p className="text-stone-500 font-black uppercase tracking-widest">No weakness data detected yet</p>
            </div>
          )}

          {sortedConceptStats.length > 0 && sortedConceptStats[0].totalCount >= 2 && (
            <div className="bg-gradient-to-br from-sky-500/10 to-indigo-500/10 border border-sky-500/30 rounded-[2.5rem] p-8">
              <h4 className="text-xs font-black text-sky-400 uppercase tracking-widest mb-4">Critical Focus Area</h4>
              <p className="text-stone-200 font-medium leading-relaxed">
                <span className="text-sky-400 font-black">{sortedConceptStats[0].concept}</span> 개념에서 
                <span className="text-indigo-400 font-black"> {sortedConceptStats[0].totalCount}회</span>의 반복적인 오류가 발견되었습니다.
                이 영역에 대한 집중적인 개념 복습과 유사 문항 풀이가 시급합니다.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
