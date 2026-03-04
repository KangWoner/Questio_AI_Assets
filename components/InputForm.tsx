
import React, { useState, useMemo, useEffect } from 'react';
import type { FormData, ModelName, LinkedFile, ExamDatabaseRecord, ExamCategory } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { TrashIcon } from './icons/TrashIcon';
import { AVAILABLE_MODELS } from '../constants';
import { SearchIcon } from './icons/SearchIcon';
import { LoadingSpinnerIcon } from './icons/LoadingSpinnerIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { LinkIcon } from './icons/LinkIcon';

interface InputFormProps {
  formData: FormData;
  onFormChange: (newFormData: Partial<FormData>) => void;
  onGenerate: () => void;
  onSearchCriteria: (selectedRecord?: ExamDatabaseRecord) => void;
  isLoading: boolean;
  isSearching: boolean;
}

const modelLabels: Record<ModelName, string> = {
  'gemini-2.5-flash': 'Standard AI',
  'gemini-2.5-pro': 'Professional AI',
  'gemini-3-flash-preview': 'v3.0 Ultra-Fast',
  'gemini-3-pro-preview': 'v3.0 Extreme',
};

const extractCleanLabel = (fullType: string, univ: string, year: string) => {
  if (!fullType) return '기타 유형';
  let label = fullType;
  if (univ) label = label.replace(new RegExp(univ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
  if (year) label = label.replace(new RegExp(year, 'g'), '');
  return label.trim() || fullType;
};

const MaterialBox: React.FC<{
  label: string;
  files: LinkedFile[];
  onFilesChange: (files: LinkedFile[]) => void;
  description: string;
  icon: React.ReactNode;
}> = ({ label, files, onFilesChange, description, icon }) => {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((f: File) => ({ name: f.name, file: f }));
      onFilesChange([...files, ...newFiles]);
    }
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-[2.5rem] p-8 flex flex-col h-full group transition-all hover:bg-stone-800/40">
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center space-x-5">
          <div className="p-4 bg-stone-950 rounded-[1.5rem] text-stone-600 group-hover:text-sky-500 transition-colors shadow-inner">
            {icon}
          </div>
          <div>
            <h4 className="text-sm font-black text-stone-200 uppercase tracking-tight">{label}</h4>
            <p className="text-[10px] text-stone-600 font-bold uppercase mt-1">{description}</p>
          </div>
        </div>
        <label className="cursor-pointer bg-white/5 hover:bg-white/10 text-white/40 hover:text-white border border-white/10 px-5 py-2.5 rounded-2xl text-[10px] font-black transition-all flex items-center uppercase tracking-widest">
          <UploadIcon className="w-4 h-4 mr-2" /> Load
          <input type="file" className="sr-only" onChange={handleFileUpload} multiple accept=".pdf,.png,.jpg,.jpeg" />
        </label>
      </div>

      <div className="flex-grow space-y-3 overflow-y-auto max-h-56 min-h-[140px] scrollbar-thin pr-3">
        {files.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-stone-800 rounded-[2rem] py-10 opacity-20">
            <span className="text-[10px] text-stone-500 font-black uppercase tracking-[0.2em]">Questio Assets</span>
          </div>
        ) : (
          files.map((f, i) => (
            <div key={i} className="flex items-center justify-between bg-stone-950/60 border border-stone-800 px-5 py-4 rounded-2xl group/item hover:border-stone-600 transition-all">
              <div className="flex items-center min-w-0 flex-1 mr-4">
                {f.url ? <LinkIcon className="w-4 h-4 text-sky-500 mr-4 shrink-0" /> : <div className="w-2 h-2 rounded-full bg-stone-700 mr-4 shrink-0" />}
                <span className={`text-xs truncate ${f.url ? 'text-sky-400 font-black' : 'text-stone-400 font-bold'}`}>{f.name}</span>
              </div>
              <button onClick={() => onFilesChange(files.filter((_, idx) => idx !== i))} className="text-stone-700 hover:text-red-500 transition-colors p-1">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const InputForm: React.FC<InputFormProps> = ({ formData, onFormChange, onGenerate, onSearchCriteria, isLoading, isSearching }) => {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [showTypes, setShowTypes] = useState(false);
  const [sortOrder, setSortOrder] = useState<'univ' | 'year'>('univ');
  const [dbUpdateKey, setDbUpdateKey] = useState(0);
  // 마지막으로 성공적으로 업로드된 파일 이름을 저장
  const [lastSyncedFileName, setLastSyncedFileName] = useState<string>('');

  const activeBucket = formData.category === 'essay' ? 'questio-assets-storage' : 'questi0-assets-simple';

  const availableRecords = useMemo(() => {
    const dbKey = formData.category === 'essay' ? 'exam_database' : 'simple_exam_database';
    const dbStr = localStorage.getItem(dbKey);
    if (!dbStr) return [];
    
    try {
      let db: ExamDatabaseRecord[] = JSON.parse(dbStr);
      const filtered = db.filter(r => {
        const univMatch = !formData.university || r.university.toLowerCase().includes(formData.university.toLowerCase());
        const yearMatch = !formData.examYear || r.year.toString().includes(formData.examYear);
        return univMatch && yearMatch;
      });

      return [...filtered].sort((a, b) => {
        if (sortOrder === 'univ') {
          return a.university.localeCompare(b.university) || b.year.localeCompare(a.year);
        } else {
          return b.year.localeCompare(a.year) || a.university.localeCompare(b.university);
        }
      });
    } catch (e) {
      return [];
    }
  }, [formData.university, formData.examYear, sortOrder, formData.category, dbUpdateKey]);

  const validateUrl = (url: string) => {
    if (!url) return false;
    const cleanUrl = url.trim().toLowerCase();
    return cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://');
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileName = file.name;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const rows = text.split(/\r?\n/).map(r => r.trim()).filter(r => r.length > 0).slice(1);
        const validatedDb: ExamDatabaseRecord[] = [];
        const errors: string[] = [];

        rows.forEach((row, index) => {
          const parts = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || row.split(',').map(s => s.trim());
          const cleanedParts = parts.map(p => p.replace(/^"|"$/g, '').trim());
          
          const univ = cleanedParts[0] || '';
          const year = cleanedParts[1] || '';
          const pType = cleanedParts[2] || '';
          const pUrl = cleanedParts[3] || '';
          const sUrl = cleanedParts[4] || '';
          
          const rowIndex = index + 2; 

          if (!univ) errors.push(`${rowIndex}행: 대학명 누락`);
          if (!year || isNaN(Number(year))) errors.push(`${rowIndex}행: 연도 오류`);
          if (!pType) errors.push(`${rowIndex}행: 유형 누락`);
          if (!pUrl || !validateUrl(pUrl)) errors.push(`${rowIndex}행: 문제지 URL(https) 오류`);
          if (!sUrl || !validateUrl(sUrl)) errors.push(`${rowIndex}행: 해설지 URL(https) 오류`);

          if (errors.length === 0) {
            validatedDb.push({ university: univ, year: year.toString(), problemType: pType, problemUrl: pUrl.trim(), solutionUrl: sUrl.trim() });
          }
        });

        if (errors.length > 0) {
          alert(`데이터 검증 실패:\n\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`);
        } else if (validatedDb.length > 0) {
          const dbKey = formData.category === 'essay' ? 'exam_database' : 'simple_exam_database';
          localStorage.setItem(dbKey, JSON.stringify(validatedDb));
          setDbUpdateKey(prev => prev + 1);
          setLastSyncedFileName(fileName); // 파일 이름 저장
          alert(`성공: '${fileName}' 파일로부터 ${validatedDb.length}건을 동기화했습니다.`);
        }
      };
      reader.readAsText(file);
    }
    // 브라우저 기본 텍스트를 초기화하기 위해 입력값을 비움 (하지만 위에 lastSyncedFileName으로 사용자에게 알려줌)
    e.target.value = '';
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === 'univ' ? 'year' : 'univ');
  };

  return (
    <div className="bg-stone-900/40 border border-stone-800/60 p-12 rounded-[5rem] shadow-5xl backdrop-blur-3xl space-y-12">
      <div className="flex bg-stone-950 p-2 rounded-[2rem] border border-stone-800">
         <button 
           onClick={() => { onFormChange({ category: 'essay' }); setLastSyncedFileName(''); }}
           className={`flex-1 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${formData.category === 'essay' ? 'bg-sky-600 text-white shadow-xl' : 'text-stone-600 hover:text-stone-400'}`}
         >
           Essay Logic (수리논술)
         </button>
         <button 
           onClick={() => { onFormChange({ category: 'short-answer' }); setLastSyncedFileName(''); }}
           className={`flex-1 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${formData.category === 'short-answer' ? 'bg-indigo-600 text-white shadow-xl' : 'text-stone-600 hover:text-stone-400'}`}
         >
           Simple Logic (약술형)
         </button>
      </div>

      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-4xl font-black text-stone-100 tracking-tighter uppercase italic">Config</h2>
           <p className="text-[10px] text-stone-600 font-black tracking-widest uppercase mt-1">GCS Sync: {activeBucket}</p>
        </div>
        <div className="flex items-center space-x-4">
          <select 
            value={formData.model}
            onChange={(e) => onFormChange({ model: e.target.value as ModelName })}
            className="bg-stone-950 text-[10px] font-black text-stone-500 border border-stone-800 px-6 py-3 rounded-2xl outline-none cursor-pointer hover:text-sky-400 transition-all shadow-inner uppercase tracking-widest"
          >
            {AVAILABLE_MODELS.map(m => (
              <option key={m} value={m} className="bg-stone-950">{modelLabels[m]}</option>
            ))}
          </select>
          <button onClick={() => setIsAdminOpen(!isAdminOpen)} className={`p-3 border rounded-2xl transition-all shadow-inner ${isAdminOpen ? 'bg-sky-500/20 border-sky-500/50 text-sky-400' : 'bg-stone-950 border-stone-800 text-stone-600 hover:text-sky-500'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </div>
      </div>

      {isAdminOpen && (
        <div className="p-8 bg-sky-500/5 border border-sky-500/10 rounded-[2.5rem] space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[11px] text-sky-500 font-black uppercase tracking-widest">{formData.category === 'essay' ? 'Essay' : 'Simple'} DB Sync (CSV)</p>
              <p className="text-[10px] text-stone-600 font-bold mt-1 uppercase">Link to {activeBucket}</p>
            </div>
          </div>
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-4">
              <label className="cursor-pointer bg-sky-500 hover:bg-sky-400 text-white px-8 py-3 rounded-2xl text-[11px] font-black transition-all shadow-xl uppercase tracking-widest shrink-0">
                파일 선택
                <input type="file" accept=".csv" onChange={handleCsvUpload} className="sr-only" />
              </label>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[11px] text-stone-400 font-bold truncate">
                  {lastSyncedFileName ? `✅ 동기화 완료: ${lastSyncedFileName}` : '선택된 파일 없음 (기본 표시)'}
                </span>
                {lastSyncedFileName && <span className="text-[9px] text-sky-500 font-black uppercase tracking-tighter">Database Refreshed!</span>}
              </div>
            </div>
            <p className="text-[9px] text-stone-600 font-medium">※ 업로드 즉시 아래 '유형 검색' 목록에 반영됩니다.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-10">
        <div className="space-y-4">
          <label className="text-[10px] font-black text-stone-600 uppercase tracking-widest ml-1">Target University</label>
          <div className="relative">
            <input
              type="text"
              value={formData.university}
              onChange={(e) => { onFormChange({ university: e.target.value }); setShowTypes(false); }}
              placeholder="Ex: 연세대학교 (essay) / 가천대학교 (simple)"
              className="w-full px-8 py-5 bg-stone-950 border border-stone-800 rounded-3xl text-stone-100 text-sm font-bold focus:border-sky-500/50 outline-none transition shadow-inner"
            />
            <button 
              onClick={toggleSort}
              className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-[9px] font-black text-stone-500 hover:text-sky-500 transition-all uppercase"
            >
              {sortOrder === 'univ' ? '정렬:가나다' : '정렬:연도'}
            </button>
          </div>
        </div>
        <div className="space-y-4">
          <label className="text-[10px] font-black text-stone-600 uppercase tracking-widest ml-1">Examination Year</label>
          <input
            type="text"
            value={formData.examYear}
            onChange={(e) => { onFormChange({ examYear: e.target.value }); setShowTypes(false); }}
            placeholder="Ex: 2025"
            className="w-full px-8 py-5 bg-stone-950 border border-stone-800 rounded-3xl text-stone-100 text-sm font-bold focus:border-sky-500/50 outline-none transition shadow-inner"
          />
        </div>
      </div>

      {(formData.university || formData.examYear) && (
        <button 
          onClick={() => setShowTypes(!showTypes)}
          className={`w-full py-5 border rounded-3xl text-[11px] font-black transition-all flex items-center justify-center gap-3 uppercase tracking-widest group shadow-xl ${formData.category === 'essay' ? 'bg-stone-800/50 border-stone-700 hover:border-sky-500/50 text-stone-400 hover:text-sky-400' : 'bg-indigo-900/10 border-indigo-900/30 hover:border-indigo-500/50 text-indigo-400 hover:text-indigo-300'}`}
        >
          <SearchIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
          {showTypes ? 'Close Database View' : `${formData.category === 'essay' ? '논술' : '약술'} 유형 검색`}
        </button>
      )}

      {showTypes && (
        <div className="space-y-5 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center px-2">
            <label className="text-[10px] font-black text-stone-600 uppercase tracking-widest">Matched Assets ({availableRecords.length})</label>
            <span className="text-[9px] font-black text-sky-500/60 uppercase">Sync: {activeBucket}</span>
          </div>
          {availableRecords.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableRecords.map((r, i) => (
                <button
                  key={i}
                  onClick={() => { onSearchCriteria(r); setShowTypes(false); }}
                  className={`w-full text-left px-8 py-6 rounded-[2.5rem] transition-all border-2 flex flex-col justify-center group ${
                    formData.problemType === r.problemType 
                    ? 'bg-sky-500/10 border-sky-500 text-sky-400 shadow-2xl' 
                    : 'bg-stone-950 border-stone-800 text-stone-500 hover:border-stone-700'
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-stone-600 opacity-60 uppercase tracking-tighter mb-1">{r.university} • {r.year}</span>
                      <span className="text-xs font-black truncate">{extractCleanLabel(r.problemType, r.university, r.year)}</span>
                    </div>
                    <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${formData.problemType === r.problemType ? 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]' : 'bg-stone-800'}`}></div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center border-2 border-dashed border-stone-800 rounded-[3rem]">
              <p className="text-[10px] text-stone-600 font-black uppercase tracking-widest">No Records Found. Please upload CSV in Config.</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <MaterialBox
          label="GCS Problem Data"
          files={formData.problemMaterials}
          onFilesChange={(fs) => onFormChange({ problemMaterials: fs })}
          description={`Bucket: ${activeBucket}`}
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
        />
        <MaterialBox
          label="GCS Solution Matrix"
          files={formData.scoringMaterials}
          onFilesChange={(fs) => onFormChange({ scoringMaterials: fs })}
          description="Logic Templates"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
        />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <label className="text-[10px] font-black text-stone-600 uppercase tracking-[0.4em]">AI Online Criteria Discovery</label>
          {isSearching && (
            <div className="flex items-center gap-3">
               <span className="text-[9px] text-sky-500 font-black animate-pulse uppercase">Searching Guidelines...</span>
               <LoadingSpinnerIcon className="w-5 h-5 text-sky-500 animate-spin" />
            </div>
          )}
        </div>
        <textarea
          value={formData.scoringCriteria}
          onChange={(e) => onFormChange({ scoringCriteria: e.target.value })}
          placeholder="유형을 선택하면 AI가 온라인에서 해당 대학의 공식 채점 기준과 모범 답안을 자동으로 찾아 이곳에 기술합니다."
          className="w-full h-56 px-10 py-8 bg-stone-950 border border-stone-800 rounded-[3.5rem] text-xs text-stone-300 focus:border-sky-500/50 outline-none transition leading-relaxed resize-none scrollbar-thin shadow-inner"
        />
      </div>

      <div className="border-t border-stone-800/50 pt-12">
        <div className="flex justify-between items-center mb-10">
          <h3 className="text-xl font-black text-stone-200 uppercase tracking-tighter">Candidate Registry</h3>
          <button onClick={() => onFormChange({ students: [...formData.students, { id: crypto.randomUUID(), name: '', email: '', solutionFiles: [], reportTemplate: '' }] })} className="bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-3 rounded-2xl text-[11px] font-black text-stone-200 transition-all flex items-center shadow-lg uppercase">
            <PlusCircleIcon className="w-5 h-5 mr-3 text-sky-500" /> Enroll New
          </button>
        </div>
        
        <div className="space-y-5 max-h-[25rem] overflow-y-auto pr-4 scrollbar-thin">
          {formData.students.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-stone-800 rounded-[4rem] opacity-20">
              <p className="text-[11px] text-stone-500 font-black uppercase tracking-[0.3em]">Registry Standby</p>
            </div>
          ) : (
            formData.students.map((s) => (
              <div key={s.id} className="p-8 bg-stone-950 border border-stone-800 rounded-[3rem] relative group hover:border-stone-600 transition-all shadow-inner">
                <button onClick={() => onFormChange({ students: formData.students.filter(std => std.id !== s.id) })} className="absolute top-8 right-8 text-stone-800 hover:text-red-500 transition-colors p-1">
                  <TrashIcon className="w-6 h-6" />
                </button>
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <input value={s.name} onChange={(e) => onFormChange({ students: formData.students.map(item => item.id === s.id ? {...item, name: e.target.value} : item) })} placeholder="성함" className="bg-[#0c0a09] px-8 py-4 rounded-2xl border border-stone-800 text-xs text-stone-200 font-bold outline-none focus:border-sky-500/30 transition shadow-inner" />
                  <input value={s.email} onChange={(e) => onFormChange({ students: formData.students.map(item => item.id === s.id ? {...item, email: e.target.value} : item) })} placeholder="이메일" className="bg-[#0c0a09] px-8 py-4 rounded-2xl border border-stone-800 text-xs text-stone-200 font-bold outline-none focus:border-sky-500/30 transition shadow-inner" />
                </div>
                <label className="flex items-center justify-center w-full px-8 py-5 border-2 border-dashed border-stone-800 rounded-2xl cursor-pointer hover:border-sky-500/30 hover:bg-sky-500/5 transition-all group/upload">
                  <span className="text-[10px] font-black text-stone-600 group-hover/upload:text-sky-500 uppercase tracking-widest transition-colors">
                    {s.solutionFiles.length > 0 ? `📄 ${s.solutionFiles.length} Scans Loaded` : 'Drop solution scans (JPG/PNG/PDF)'}
                  </span>
                  <input type="file" multiple onChange={(e) => onFormChange({ students: formData.students.map(item => item.id === s.id ? {...item, solutionFiles: Array.from(e.target.files || [])} : item) })} className="sr-only" />
                </label>
              </div>
            ))
          )}
        </div>
      </div>

      <button
        onClick={onGenerate}
        disabled={isLoading || formData.students.length === 0 || !formData.scoringCriteria}
        className={`w-full py-8 text-white rounded-[3.5rem] font-black text-2xl shadow-3xl transform transition active:scale-[0.98] disabled:opacity-20 disabled:grayscale flex items-center justify-center uppercase italic ${formData.category === 'essay' ? 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-sky-900/30' : 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 shadow-indigo-900/30'}`}
      >
        {isLoading ? (
          <div className="flex items-center">
            <LoadingSpinnerIcon className="animate-spin w-8 h-8 mr-6" />
            {formData.category === 'essay' ? 'Logic Analysis...' : 'Quick Evaluation...'}
          </div>
        ) : (
          <div className="flex items-center">
            <span className="mr-4 tracking-tighter uppercase">Execute {formData.category === 'essay' ? 'Essay' : 'Simple'}-Engine</span>
            <span className="px-4 py-1.5 bg-white/20 rounded-2xl text-[11px] font-black">{formData.students.length} BATCH</span>
          </div>
        )}
      </button>
    </div>
  );
};
