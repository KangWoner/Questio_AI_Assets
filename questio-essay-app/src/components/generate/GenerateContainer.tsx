import React, { useState, useRef } from 'react';
import { Copy, Sparkles, AlertCircle, Camera, Upload, X, CopyMinus, HelpCircle, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { auth, useToken, refundToken } from '../../firebase';

type FileData = { data: string; mimeType: string; name: string };

type Problem = {
  problemText: string;
  solutionText: string;
};

export default function GenerateContainer() {
  const [questionText, setQuestionText] = useState('');
  const [questionFiles, setQuestionFiles] = useState<FileData[]>([]);
  const [count, setCount] = useState(3);

  const [loading, setLoading] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [contextUsed, setContextUsed] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRefQ = useRef<HTMLInputElement>(null);
  const cameraInputRefQ = useRef<HTMLInputElement>(null);

  // --- File Processing Helpers ---
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
    // Only accept up to 1 image for now
    for (let i = 0; i < Math.min(files.length, 1); i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
            const base64 = await resizeImage(file);
            newFiles.push({ data: base64, mimeType: 'image/jpeg', name: file.name });
        } else {
            alert('이미지 파일만 업로드 가능합니다.');
        }
    }
    setQuestionFiles(newFiles);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setQuestionFiles(prev => prev.filter((_, i) => i !== index));
  };

  // --- Generate Handler ---
  const handleGenerate = async () => {
    if (!questionText.trim() && questionFiles.length === 0) {
      alert('기준이 될 유사 문제 원본 텍스트나 이미지를 올려주세요.');
      return;
    }
    
    setLoading(true);
    setProblems([]);
    setErrorMsg(null);
    setContextUsed(false);

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
      const endpoint = 'https://us-central1-questio-ai-b2b.cloudfunctions.net/generateSimilarProblems';

      let payload: any = { count };
      
      const escapeInstruction = '\n\n[중요 시스템 지침: 응답을 JSON 형식으로 반환할 때, LaTeX 수식 등의 모든 백슬래시(\\)는 반드시 두 번(\\\\) 입력하여 올바른 JSON 이스케이프 처리를 유지하세요. 예: \\\\frac, \\\\sqrt. 큰따옴표 내부에 개행이나 제어문자가 포함되지 않도록 하세요.]';
      
      payload.problemText = (questionText || '') + escapeInstruction;

      if (questionFiles.length > 0) {
          payload.imageBase64 = questionFiles[0].data;
          payload.mimeType = questionFiles[0].mimeType;
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

      const textResponse = await response.text();
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (parseErr) {
        console.warn('JSON Parse Error due to bad escaping. Attempting to clean string...', parseErr);
        // Clean unescaped backslashes (e.g., LaTeX \( or \frac)
        const cleanedText = textResponse.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
        try {
          data = JSON.parse(cleanedText);
        } catch (cleanErr) {
          throw new Error('서버 응답 데이터를 해석하지 못했습니다. (JSON 파싱 에러)');
        }
      }

      setProblems(data.problems || []);
      setContextUsed(data.contextUsed || false);
    } catch (error: any) {
      console.error('Generate Error:', error);
      setErrorMsg(error.message || '유사 문제 생성 중 오류가 발생했습니다.');
      if (tokenDeducted && auth.currentUser) {
        try {
          await refundToken(auth.currentUser.uid);
        } catch (e) {}
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('클립보드에 복사되었습니다.');
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-y-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-900/60 backdrop-blur-2xl sticky top-0 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200 flex items-center gap-2.5">
          <CopyMinus className="w-6 h-6 text-fuchsia-400" />
          유사 문제 생성기
        </h1>
      </div>

      <div className="p-5 space-y-6 max-w-2xl mx-auto w-full pt-6">
        {/* 설명 안내 */}
        <div className="glass-card p-5 rounded-[24px] text-sm text-indigo-200 mb-2 border border-indigo-500/20 shadow-[0_4px_20px_rgba(99,102,241,0.05)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
          <p className="font-bold mb-1.5 text-white flex items-center gap-2">
            <span className="bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-md tracking-wider">PRO</span> 교과서 기반 쌍둥이 문제 AI
          </p>
          <p className="opacity-90 leading-relaxed font-medium">
            문제를 사진으로 찍거나 입력하시면, 해당 학년 교과서 개념을 분석하여 난이도와 유형이 똑같은 '쌍둥이 문제'를 찍어냅니다! <br/>
            <span className="text-indigo-300 font-bold mt-1 inline-block">* 1회 생성 시 1 Q-Token 소모</span>
          </p>
        </div>

        {/* 문제 입력칸 */}
        <div className="glass-card rounded-[24px] overflow-hidden mb-5 group hover:border-indigo-500/40 hover:shadow-[0_8px_30px_rgba(99,102,241,0.1)] transition-all duration-300 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
          <div className="bg-white/5 px-5 py-4 border-b border-white/5 flex justify-between items-center">
            <h3 className="font-bold text-white text-[15px]">원본 문제 입력</h3>
            <div className="flex gap-2">
               <button title="카메라 촬영" aria-label="카메라 촬영" onClick={() => cameraInputRefQ.current?.click()} className="p-2.5 bg-white/5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 transition-all active:scale-95 shadow-sm tooltip tooltip-left" data-tip="카메라 촬영">
                 <Camera className="w-4 h-4" />
               </button>
               <button title="파일 이미지 첨부" aria-label="파일 이미지 첨부" onClick={() => fileInputRefQ.current?.click()} className="p-2.5 bg-white/5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 transition-all active:scale-95 shadow-sm tooltip tooltip-left" data-tip="파일/이미지 첨부">
                 <Upload className="w-4 h-4" />
               </button>
               
               <input title="카메라 이미지 입력" aria-label="카메라 이미지 입력" type="file" accept="image/*" ref={cameraInputRefQ} className="hidden" onChange={handleFileUpload} />
               <input title="파일 이미지 입력" aria-label="파일 이미지 입력" type="file" accept="image/*" ref={fileInputRefQ} className="hidden" onChange={handleFileUpload} />
            </div>
          </div>
          <div className="p-5 z-10 relative">
            {questionFiles.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-4">
                {questionFiles.map((file, idx) => (
                  <div key={idx} className="relative group flex items-center bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 rounded-xl text-sm shadow-inner transition-all hover:bg-indigo-500/30">
                    <span className="truncate max-w-[120px] text-indigo-200 font-bold text-xs">{file.name}</span>
                    <button title="추가된 파일 삭제" aria-label="추가된 파일 삭제" onClick={() => removeFile(idx)} className="ml-2 text-indigo-300 hover:text-fuchsia-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <textarea
              className="w-full min-h-[100px] bg-transparent resize-none text-[15px] font-medium text-white placeholder-slate-500 focus:outline-none"
              placeholder="여기에 문제 텍스트를 복사해서 붙여넣거나, 상단 버튼을 눌러 문제 사진을 올리세요."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            />
          </div>
        </div>
        
        {/* 생성 개수 옵션 */}
        <div className="flex items-center gap-4 glass-card p-5 rounded-[24px] shadow-sm mb-8">
            <span className="text-[14px] font-bold text-slate-300">생성할 문제 개수:</span>
            <div className="flex gap-2.5">
                {[1, 3, 5].map(num => (
                    <button 
                        key={num}
                        onClick={() => setCount(num)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all hover:scale-105 active:scale-95 ${count === num ? 'bg-indigo-500/30 border-indigo-400 text-indigo-200 shadow-inner' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                    >
                        {num}개
                    </button>
                ))}
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
            onClick={handleGenerate}
            disabled={loading || (!questionText.trim() && questionFiles.length === 0)}
            className="w-full relative group overflow-hidden bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 text-white font-bold py-4.5 px-4 rounded-[20px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(217,70,239,0.4)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-700"></div>
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>AI가 논술 교재를 검색하며 문제를 생성중입니다...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 drop-shadow-md" />
                <span className="text-[16px] tracking-wide drop-shadow-md">유사 문제 {count}개 즉시 생성</span>
              </>
            )}
          </button>
        </div>

        {/* 결과 렌더링 영역 */}
        {problems.length > 0 && (
          <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 glass-card p-6 border-indigo-500/30 rounded-[28px] shadow-[0_10px_50px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-4 border-b border-indigo-500/20 pb-4">
                <h2 className="font-bold text-lg text-white flex items-center gap-2">
                   <CopyMinus className="w-5 h-5 text-indigo-400" />
                   생성된 유사 문제들
                </h2>
                {contextUsed && (
                    <span className="flex items-center gap-1.5 text-[11px] bg-green-500/20 border border-green-500/30 text-green-300 px-3 py-1 rounded-full font-bold shadow-inner">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        교과서 매핑 완료
                    </span>
                )}
            </div>

            {problems.map((prob, idx) => (
                <div key={idx} className="bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-white/5 px-5 py-3.5 border-b border-white/10 flex justify-between items-center">
                        <h3 className="font-bold text-indigo-200">문제 {idx + 1}</h3>
                        <button onClick={() => copyToClipboard(`[문제 ${idx+1}]\n${prob.problemText}\n\n[정답/풀이]\n${prob.solutionText}`)} className="text-slate-300 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5 text-xs font-bold bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg active:scale-95">
                            <Copy className="w-3.5 h-3.5"/> 전체 복사
                        </button>
                    </div>
                    <div className="p-6 space-y-5">
                        <div className="prose prose-sm md:prose-base prose-invert max-w-none prose-p:leading-relaxed text-slate-200">
                           <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]}>
                             {prob.problemText}
                           </ReactMarkdown>
                        </div>
                        
                        <div className="mt-5 pt-5 border-t border-dashed border-white/10 bg-emerald-900/10 rounded-xl px-5 py-4">
                            <h4 className="text-xs font-bold text-emerald-400 mb-3 flex items-center gap-1.5">
                                <HelpCircle className="w-4 h-4" /> 정답 및 풀이 가이드
                            </h4>
                            <div className="prose prose-sm prose-invert max-w-none text-slate-300 text-[14px]">
                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]}>
                                  {prob.solutionText}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
