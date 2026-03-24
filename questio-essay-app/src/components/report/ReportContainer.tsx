import { useState, useRef } from 'react';
import { Sparkles, AlertCircle, Camera, Upload, X, Copy, Download, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { auth, useToken, refundToken } from '../../firebase';
// @ts-ignore
import html2pdf from 'html2pdf.js';

type FileData = { data: string; mimeType: string; name: string };

export default function ReportContainer() {
  const [questionText, setQuestionText] = useState('');
  const [questionFiles, setQuestionFiles] = useState<FileData[]>([]);

  const [rubricText, setRubricText] = useState('');
  const [rubricFiles, setRubricFiles] = useState<FileData[]>([]);

  const [essayText, setEssayText] = useState('');
  const [essayFiles, setEssayFiles] = useState<FileData[]>([]);

  const [loading, setLoading] = useState(false);
  const [reportResult, setReportResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isWorkbookMode, setIsWorkbookMode] = useState(false);

  const fileInputRefQ = useRef<HTMLInputElement>(null);
  const fileInputRefR = useRef<HTMLInputElement>(null);
  const fileInputRefE = useRef<HTMLInputElement>(null);
  const cameraInputRefQ = useRef<HTMLInputElement>(null);
  const cameraInputRefR = useRef<HTMLInputElement>(null);
  const cameraInputRefE = useRef<HTMLInputElement>(null);

  // --- File Processing Helpers ---
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

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

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setFiles: React.Dispatch<React.SetStateAction<FileData[]>>
  ) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: FileData[] = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
            const base64 = await resizeImage(file);
            newFiles.push({ data: base64, mimeType: 'image/jpeg', name: file.name });
        } else if (file.type === 'application/pdf') {
            const base64 = await readFileAsBase64(file);
            newFiles.push({ data: base64, mimeType: file.type, name: file.name });
        } else {
            alert('이미지 또는 PDF 파일만 업로드 가능합니다.');
        }
    }
    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removeFile = (
    index: number,
    setFiles: React.Dispatch<React.SetStateAction<FileData[]>>
  ) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // --- Submit Handler ---
  const handleGenerateReport = async () => {
    if (!essayText.trim() && essayFiles.length === 0) {
      alert('작성한 글(본문) 텍스트나 학생 답안 이미지를 최소 1개 이상 올려주세요.');
      return;
    }
    
    setLoading(true);
    setReportResult(null);
    setErrorMsg(null);

    let tokenDeducted = false;

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('로그인이 필요합니다.');
      
      const hasToken = await useToken(user.uid);
      if (!hasToken) {
        alert('Q-Token이 부족합니다. 내 정보 상점에서 충전해주세요.');
        setLoading(false);
        return;
      }
      tokenDeducted = true;
      
      const idToken = await user.getIdToken();
      const endpoint = 'https://us-central1-questio-ai-b2b.cloudfunctions.net/generateEssaySummary';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          questionText, questionFiles,
          rubricText, rubricFiles,
          essayText, essayFiles,
          mode: isWorkbookMode ? 'workbook' : 'report'
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `서버 에러 (${response.status})`);
      }

      const data = await response.json();
      setReportResult(data.text);
    } catch (error: any) {
      console.error('Report Error:', error);
      setErrorMsg(error.message || '리포트 생성 중 오류가 발생했습니다.');
      if (tokenDeducted && auth.currentUser) {
        try {
          await refundToken(auth.currentUser.uid);
        } catch (e) {
          console.error('Refund failed:', e);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Export Handlers ---
  const handleCopyText = async () => {
    if (reportResult) {
      await navigator.clipboard.writeText(reportResult);
      alert('텍스트가 클립보드에 복사되었습니다.');
    }
  };

  const handleExportHTML = () => {
    const element = document.getElementById('report-result-content');
    if (!element) return;
    
    // TailwindStyles 및 기본 스타일 포함
    const styles = `
      <style>
        body { font-family: 'Pretendard', sans-serif; padding: 20px; color: #1e293b; background: white; }
        h1, h2, h3 { color: #0f172a; margin-top: 1.5em; }
        p, li { line-height: 1.6; }
        .prose { max-w-none; }
      </style>
    `;
    const blob = new Blob([`<html><head><meta charset="UTF-8">${styles}</head><body>${element.innerHTML}</body></html>`], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Questio_Report.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const element = document.getElementById('report-result-content');
    if (!element) return;
    const opt = {
      margin:       10,
      filename:     isWorkbookMode ? 'Questio_Workbook.pdf' : 'Questio_Report.pdf',
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };
    html2pdf().from(element).set(opt).save();
  };

  const handlePrint = () => {
    window.print();
  };

  // --- Sub-components ---
  const SectionInput = (
    title: string, 
    text: string, 
    setText: (t: string) => void, 
    files: FileData[], 
    setFiles: React.Dispatch<React.SetStateAction<FileData[]>>,
    fRef: React.RefObject<any>,
    cRef: React.RefObject<any>,
    placeholder: string
  ) => (
    <div className="glass-card rounded-[24px] overflow-hidden mb-5 group hover:border-indigo-500/40 hover:shadow-[0_8px_30px_rgba(99,102,241,0.1)] transition-all duration-300 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      <div className="bg-white/5 px-5 py-4 border-b border-white/5 flex justify-between items-center">
        <h3 className="font-bold text-white text-[15px]">{title}</h3>
        <div className="flex gap-2">
           <button title="카메라 촬영" aria-label="카메라 촬영" onClick={() => cRef.current?.click()} className="p-2.5 bg-white/5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 transition-all active:scale-95 shadow-sm tooltip tooltip-left" data-tip="카메라 촬영">
             <Camera className="w-4 h-4" />
           </button>
           <button title="파일/이미지 첨부" aria-label="파일/이미지 첨부" onClick={() => fRef.current?.click()} className="p-2.5 bg-white/5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 transition-all active:scale-95 shadow-sm tooltip tooltip-left" data-tip="파일/이미지 첨부">
             <Upload className="w-4 h-4" />
           </button>
           {/* Hidden Inputs */}
           <input title="카메라 입력" aria-label="카메라 입력" type="file" accept="image/*" ref={cRef} className="hidden" onChange={(e) => handleFileUpload(e, setFiles)}/>
           <input title="파일 입력" aria-label="파일 입력" type="file" accept="image/*,application/pdf" multiple ref={fRef} className="hidden" onChange={(e) => handleFileUpload(e, setFiles)}/>
        </div>
      </div>
      <div className="p-5 z-10 relative">
        {files.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {files.map((file, idx) => (
              <div key={idx} className="relative group flex items-center bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 rounded-xl text-sm shadow-inner transition-all hover:bg-indigo-500/30">
                <span className="truncate max-w-[120px] text-indigo-200 font-bold text-xs">{file.name}</span>
                <button title="파일 삭제" aria-label="파일 삭제" onClick={() => removeFile(idx, setFiles)} className="ml-2 text-indigo-300 hover:text-fuchsia-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <textarea
          className="w-full min-h-[100px] bg-transparent resize-none text-[15px] font-medium text-white placeholder-slate-500 focus:outline-none"
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-transparent overflow-y-auto print:bg-white print:text-black">
      {/* Header - hide on print */}
      <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-900/60 backdrop-blur-2xl sticky top-0 z-20 shadow-lg print:hidden">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200 flex items-center gap-2.5">
          <Sparkles className="w-6 h-6 text-fuchsia-400" />
          초개인화 진단 리포트
        </h1>
      </div>

      <div className="p-5 space-y-6 max-w-2xl mx-auto w-full pt-6 print:p-0 print:block">
        {/* 설명 안내 - hide on print */}
        <div className="glass-card p-5 rounded-[24px] text-sm text-indigo-200 mb-2 border border-fuchsia-500/20 shadow-[0_4px_20px_rgba(217,70,239,0.05)] relative overflow-hidden print:hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-3xl"></div>
          <p className="font-bold mb-1.5 text-white flex items-center gap-2">
            <span className="bg-fuchsia-500 text-white text-[10px] px-2 py-0.5 rounded-md tracking-wider">PRO</span> 멀티모달 1타 강사 AI 첨삭
          </p>
          <p className="opacity-90 leading-relaxed font-medium">
            문제, 채점기준, 내 답안을 카메라로 찍거나 파일로 첨부하세요. 
            텍스트와 복합적으로 분석하여 대치동 1타 수준의 리포트를 뽑아드립니다. <br/>
            <span className="text-fuchsia-300 font-bold mt-1 inline-block">* Q-Token 1개 소모</span>
          </p>
        </div>

        {/* 1. 문제 입력 */}
        {SectionInput('1. 문제 (Question)', questionText, setQuestionText, questionFiles, setQuestionFiles, fileInputRefQ, cameraInputRefQ, '풀어야 했던 문제나 논제, 지문을 입력하거나 사진/PDF를 첨부하세요 (선택)')}
        
        {/* 2. 채점기준 입력 */}
        {SectionInput('2. 채점기준 및 예시답안 (Rubric)', rubricText, setRubricText, rubricFiles, setRubricFiles, fileInputRefR, cameraInputRefR, '학교측 채점 기준표나 모범 답안을 제공하면 정확도가 급상승합니다 (선택)')}

        {/* 3. 답안 입력 */}
        {SectionInput('3. 학생 작성 답안 (Essay)', essayText, setEssayText, essayFiles, setEssayFiles, fileInputRefE, cameraInputRefE, '본인이 작성한 원문 텍스트를 붙여넣거나, 시험지를 사진으로 찍어서 첨부하세요 (필수)')}

        {/* 워크북 모드 토글 - hide on print */}
        <div className="flex items-center justify-between glass-card p-5 rounded-[20px] shadow-sm mb-4 print:hidden">
          <div>
            <h4 className="font-bold text-white text-[15px] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-400" /> 워크북(연습장) 모드로 생성
            </h4>
            <p className="text-[12px] text-slate-400 mt-1">
              정답 부분을 가리고 스스로 연습할 수 있는 빈칸 워크북 형태로 리포트를 생성합니다.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={isWorkbookMode}
              onChange={() => setIsWorkbookMode(!isWorkbookMode)}
              aria-label="워크북 모드 활성화"
              title="워크북 모드 활성화"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        {/* 에러 메시지 - hide on print */}
        {errorMsg && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl text-sm px-4 print:hidden">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        {/* 분석 버튼 - hide on print */}
        <div className="pt-2 pb-6 print:hidden">
          <button
            onClick={handleGenerateReport}
            disabled={loading || (!essayText.trim() && essayFiles.length === 0)}
            className="w-full relative group overflow-hidden bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 text-white font-bold py-4.5 px-4 rounded-[20px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(217,70,239,0.4)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-700"></div>
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>AI가 멀티모달 문서를 스캔 중입니다...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 drop-shadow-md" />
                <span className="text-[16px] tracking-wide drop-shadow-md">복합 진단 리포트 생성하기</span>
              </>
            )}
          </button>
        </div>

        {/* 결과 렌더링 영역 */}
        {reportResult && (
          <div className="mt-4 glass-card border-fuchsia-500/30 rounded-[28px] overflow-hidden shadow-[0_10px_50px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom-8 duration-700 print:shadow-none print:border-none print:bg-white print:m-0 print:p-0">
            <div className="bg-gradient-to-r from-indigo-500/20 to-fuchsia-500/20 px-6 py-5 border-b border-fuchsia-500/20 flex justify-between items-center backdrop-blur-md print:hidden">
              <h2 className="font-bold flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5 text-fuchsia-400" />
                {isWorkbookMode ? '워크북 생성 완료' : '분석 리포트 완료'}
              </h2>
            </div>
            
            {/* 리포트 본문 영역 (PDF 추출 타겟) */}
            <div id="report-result-content" className="p-6 overflow-x-auto bg-slate-900/40 print:bg-white print:p-0">
              <div className="prose prose-sm md:prose-base prose-invert max-w-none text-slate-200
                prose-headings:text-indigo-100 prose-headings:font-bold
                prose-p:leading-relaxed prose-a:text-fuchsia-400 prose-li:my-1
                print:prose-p:text-black print:prose-headings:text-black print:text-black print:prose-invert:none"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]}>
                  {reportResult}
                </ReactMarkdown>
              </div>
            </div>

            {/* 내보내기 버튼들 - hide on print */}
            <div className="bg-slate-950/50 p-5 border-t border-white/10 grid grid-cols-4 gap-3 print:hidden">
              <button title="텍스트 복사" aria-label="텍스트 복사" onClick={handleCopyText} className="flex flex-col items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 active:scale-95 group">
                <Copy className="w-5 h-5 text-indigo-300 group-hover:text-indigo-200" />
                <span className="text-[10px] font-bold text-slate-300">텍스트 복사</span>
              </button>
              <button title="프린트 출력" aria-label="프린트 출력" onClick={handlePrint} className="flex flex-col items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 active:scale-95 group">
                <FileText className="w-5 h-5 text-indigo-300 group-hover:text-indigo-200" />
                <span className="text-[10px] font-bold text-slate-300">인쇄 (Print)</span>
              </button>
              <button title="HTML 저장" aria-label="HTML 저장" onClick={handleExportHTML} className="col-span-1 flex flex-col items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 active:scale-95 group">
                <FileText className="w-5 h-5 text-indigo-300 group-hover:text-indigo-200" />
                <span className="text-[10px] font-bold text-slate-300">HTML 저장</span>
              </button>
              <button title="PDF 다운로드" aria-label="PDF 다운로드" onClick={handleExportPDF} className="flex flex-col items-center justify-center gap-2 py-3 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-2xl transition-all border border-indigo-500/30 active:scale-95 group shadow-inner">
                <Download className="w-5 h-5 text-fuchsia-400 group-hover:text-fuchsia-300" />
                <span className="text-[10px] font-bold text-fuchsia-100">PDF 다운로드</span>
              </button>
            </div>
          </div>
        )}
        
        {/* 하단 패딩 공간 - hide on print */}
        <div className="h-10 print:hidden"></div>
      </div>
    </div>
  );
}
