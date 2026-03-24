import { useState } from 'react';
import { PenTool, Sparkles, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { auth } from '../../firebase';

export default function ReportContainer() {
  const [essayText, setEssayText] = useState('');
  const [essayContext, setEssayContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportResult, setReportResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    if (!essayText.trim()) return;
    
    setLoading(true);
    setReportResult(null);
    setErrorMsg(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('로그인이 필요합니다.');
      
      const idToken = await user.getIdToken();
      const endpoint = 'https://us-central1-questio-ai-b2b.cloudfunctions.net/generateEssaySummary';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          essayText,
          essayContext: essayContext || '해당 없음'
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <PenTool className="w-5 h-5 text-blue-500" />
          초개인화 진단 리포트
        </h1>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
        {/* 설명 안내 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-sm text-blue-800 dark:text-blue-300">
          <p className="font-semibold mb-1">📝 내 글을 대치동 1타 강사처럼 분석해드립니다</p>
          <p className="opacity-80">
            작성하신 논술 답안, 자기소개서, 혹은 국어/영어 장문을 아래에 붙여넣으세요. 
            AI가 5초 만에 요약과 날카로운 첨삭 리포트를 제공합니다. (Q-Token 1개 소모)
          </p>
        </div>

        {/* 조건 입력 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            맥락 & 조건 (선택)
          </label>
          <input
            type="text"
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            placeholder="예) 2024년 모의고사 국어 34번 지문 요약, 연세대 논술 2번 문항 등"
            value={essayContext}
            onChange={(e) => setEssayContext(e.target.value)}
          />
        </div>

        {/* 본문 입력 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            작성한 글 (원문)
          </label>
          <textarea
            className="w-full h-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none dark:text-white"
            placeholder="이곳에 평가받을 글을 길게 붙여넣으세요..."
            value={essayText}
            onChange={(e) => setEssayText(e.target.value)}
          />
        </div>

        {/* 에러 메시지 */}
        {errorMsg && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 분석 버튼 */}
        <button
          onClick={handleGenerateReport}
          disabled={loading || !essayText.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>AI가 분석 중입니다...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>진단 리포트 생성하기</span>
            </>
          )}
        </button>

        {/* 결과 렌더링 영역 */}
        {reportResult && (
          <div className="mt-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-blue-600 px-5 py-4 text-white">
              <h2 className="font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                분석 리포트 완료
              </h2>
            </div>
            <div className="p-5 overflow-x-auto">
              <div className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200
                prose-headings:text-slate-900 dark:prose-headings:text-slate-100
                prose-p:leading-relaxed prose-a:text-blue-500"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]}>
                  {reportResult}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
        
        {/* 하단 패딩 공간 (바텀 네비게이션 가려짐 방지) */}
        <div className="h-8"></div>
      </div>
    </div>
  );
}
