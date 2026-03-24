import React, { useState, useRef } from 'react';
import { Sparkles, AlertCircle, Camera, Upload, X, CheckCircle2, Bookmark } from 'lucide-react';
import { auth, useToken, refundToken } from '../../firebase';

type FileData = { data: string; mimeType: string; name: string };
type TagResult = {
  grade?: string;
  chapter?: string;
  concepts?: string[];
  [key: string]: any;
};

export default function TaggerContainer() {
  const [problemText, setProblemText] = useState('');
  const [problemFiles, setProblemFiles] = useState<FileData[]>([]);

  const [loading, setLoading] = useState(false);
  const [tagResult, setTagResult] = useState<TagResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // --- File Processing ---
  const resizeImage = (file: File, maxWidth = 1200): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: FileData[] = [];
    for (let i = 0; i < Math.min(files.length, 1); i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
            const base64 = await resizeImage(file);
            newFiles.push({ data: base64, mimeType: 'image/jpeg', name: file.name });
        } else {
            alert('이미지 파일만 업로드 가능합니다.');
        }
    }
    setProblemFiles(newFiles);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setProblemFiles(prev => prev.filter((_, i) => i !== index));
  };

  // --- Tagging Handler ---
  const handleTagging = async () => {
    if (!problemText.trim() && problemFiles.length === 0) {
      alert('태깅할 문제 텍스트나 이미지를 입력해주세요.');
      return;
    }
    
    setLoading(true);
    setTagResult(null);
    setErrorMsg(null);

    let tokenDeducted = false;

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('로그인이 필요합니다.');
      
      const hasToken = await useToken(user.uid);
      if (!hasToken) {
        window.dispatchEvent(new Event('openPaywall'));
        setLoading(false);
        return;
      }
      tokenDeducted = true;
      
      const idToken = await user.getIdToken();
      // Test URL or deployed URL
      const endpoint = 'https://us-central1-questio-ai-b2b.cloudfunctions.net/autoTagProblem';

      let payload: any = {};
      if (problemText) payload.problemText = problemText;
      if (problemFiles.length > 0) {
          payload.imageBase64 = problemFiles[0].data;
          payload.mimeType = problemFiles[0].mimeType;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `서버 에러 (${response.status})`);
      }

      const data = await response.json();
      setTagResult(data);
    } catch (error: any) {
      console.error('Tagging Error:', error);
      setErrorMsg(error.message || '태깅 분석 중 오류가 발생했습니다.');
      if (tokenDeducted && auth.currentUser) {
        try {
          await refundToken(auth.currentUser.uid);
        } catch (e) {}
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-y-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-900/60 backdrop-blur-2xl sticky top-0 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-emerald-200 flex items-center gap-2.5">
          <Bookmark className="w-6 h-6 text-emerald-400" />
          자동 태깅(족보 매핑) 봇
        </h1>
      </div>

      <div className="p-5 space-y-6 max-w-2xl mx-auto w-full pt-6">
        {/* 설명 안내 */}
        <div className="glass-card p-5 rounded-[24px] text-sm text-emerald-200 mb-2 border border-emerald-500/20 shadow-[0_4px_20px_rgba(16,185,129,0.05)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <p className="font-bold mb-1.5 text-white flex items-center gap-2">
            <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-md tracking-wider">PRO</span> 기출문제 AI 족보 분석
          </p>
          <p className="opacity-90 leading-relaxed font-medium">
            학원의 내신 기출문제나 교재 사진을 올리면, Vertex AI가 중/고등 교과서 DB를 분석하여 '해당 학년/과목, 대단원, 핵심 개념' 태그를 자동으로 추출합니다!
          </p>
        </div>

        {/* 문제 입력칸 */}
        <div className="glass-card rounded-[24px] overflow-hidden mb-5 group hover:border-emerald-500/40 hover:shadow-[0_8px_30px_rgba(16,185,129,0.1)] transition-all duration-300 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
          <div className="bg-white/5 px-5 py-4 border-b border-white/5 flex justify-between items-center">
            <h3 className="font-bold text-white text-[15px]">태깅할 문제 등록</h3>
            <div className="flex gap-2">
               <button title="카메라 촬영" aria-label="카메라 촬영" onClick={() => cameraInputRef.current?.click()} className="p-2.5 bg-white/5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 transition-all active:scale-95 shadow-sm tooltip tooltip-left" data-tip="카메라 촬영">
                 <Camera className="w-4 h-4" />
               </button>
               <button title="파일 이미지 첨부" aria-label="파일 이미지 첨부" onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-white/5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 transition-all active:scale-95 shadow-sm tooltip tooltip-left" data-tip="파일/이미지 첨부">
                 <Upload className="w-4 h-4" />
               </button>
               <input title="카메라 이미지 입력" aria-label="카메라 이미지 입력" type="file" accept="image/*" ref={cameraInputRef} className="hidden" onChange={handleFileUpload} />
               <input title="파일 이미지 입력" aria-label="파일 이미지 입력" type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            </div>
          </div>
          <div className="p-5 z-10 relative">
            {problemFiles.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-4">
                {problemFiles.map((file, idx) => (
                  <div key={idx} className="relative group flex items-center bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-sm shadow-inner transition-all hover:bg-emerald-500/30">
                    <span className="truncate max-w-[120px] text-emerald-200 font-bold text-xs">{file.name}</span>
                    <button title="추가된 파일 삭제" aria-label="추가된 파일 삭제" onClick={() => removeFile(idx)} className="ml-2 text-emerald-300 hover:text-red-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <textarea
              className="w-full min-h-[100px] bg-transparent resize-none text-[15px] font-medium text-white placeholder-slate-500 focus:outline-none"
              placeholder="여기에 문제 텍스트를 입력하시거나 이미지를 첨부해 주세요."
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
            />
          </div>
        </div>
        
        {/* 에러 메시지 */}
        {errorMsg && (
          <div className="flex items-center gap-2 text-red-400 bg-red-900/30 border border-red-500/30 p-4 py-3 rounded-[16px] text-sm px-4 mb-5 shadow-inner backdrop-blur-md">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="leading-snug font-medium">{errorMsg}</span>
          </div>
        )}

        {/* 분석 버튼 */}
        <div className="pt-2 pb-6">
          <button
            onClick={handleTagging}
            disabled={loading || (!problemText.trim() && problemFiles.length === 0)}
            className="w-full relative group overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-4.5 px-4 rounded-[20px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(20,184,166,0.4)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-700"></div>
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>교과서 데이터베이스와 족보 매핑 중입니다...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 drop-shadow-md" />
                <span className="text-[16px] tracking-wide drop-shadow-md">AI 태깅 분석 시작 (1 Q-Token)</span>
              </>
            )}
          </button>
        </div>

        {/* 결과 렌더링 영역 */}
        {tagResult && (
          <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 glass-card p-6 border-emerald-500/30 rounded-[28px] shadow-[0_10px_50px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-4 border-b border-emerald-500/20 pb-4">
              <h2 className="font-bold flex items-center gap-2 text-white">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                족보 분석 완료
              </h2>
            </div>
            
            <div className="p-2 space-y-5">
               <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">학년 / 과목 (Grade)</span>
                  <div className="text-[15px] font-bold text-slate-200 bg-white/5 p-3 rounded-xl border border-white/10 shadow-inner">
                      {tagResult.grade || "파악 불가"}
                  </div>
               </div>

               <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">대단원 / 목차 (Chapter)</span>
                  <div className="text-[15px] font-bold text-slate-200 bg-white/5 p-3 rounded-xl border border-white/10 shadow-inner">
                      {tagResult.chapter || "파악 불가"}
                  </div>
               </div>

               <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">핵심 개념 (Concepts)</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                      {tagResult.concepts && tagResult.concepts.length > 0 ? (
                           tagResult.concepts.map((concept, i) => (
                               <span key={i} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 font-bold text-sm rounded-xl border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors shadow-inner cursor-default">
                                   #{concept}
                               </span>
                           ))
                      ) : (
                          <span className="text-sm font-medium text-slate-500">감지된 핵심 개념 없음</span>
                      )}
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
