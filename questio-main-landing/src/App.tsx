import './index.css';

function App() {
  return (
    <div className="app-container">
      {/* Background blobs for modern glassmorphism effect */}
      <div className="blob blob-fuchsia"></div>
      <div className="blob blob-cyan"></div>

      {/* Navigation */}
      <nav className="animate-fade-in">
        <a href="/" className="logo">
          QUESTIO<span>AI</span>
        </a>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Hero Section */}
        <section className="hero animate-fade-in delay-100">
          <div className="badge">
            AI 기반 초개인화 논술 솔루션
          </div>
          <h1>
            논술 합격의 마스터키, <br />
            <span className="text-gradient gradient-fuchsia">Questio AI</span>가 함께합니다
          </h1>
          <p>
            학부모를 위한 초개인화 진단부터, 학원을 위한 AI 자동 채점 시스템까지.<br />
            대학별 수리논술의 완벽한 솔루션을 지금 바로 경험해 보세요.
          </p>

          <div className="cta-group">
            {/* B2C Button */}
            <a 
              href="https://questio-2dd69.web.app" 
              className="btn btn-b2c"
            >
              <svg 
                className="btn-icon" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              [학생/학부모] 초개인화 진단
            </a>

            {/* B2B Button */}
            <a 
              href="https://questio-ai-b2b.web.app" 
              className="btn btn-b2b"
            >
              <svg 
                className="btn-icon" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              [학원/강사] AI 채점 조교
            </a>
          </div>
        </section>

        {/* Features Selection Grid */}
        <section className="features-grid animate-fade-in delay-200">
          
          {/* B2C Feature Card */}
          <div className="feature-card glass-panel card-b2c">
            <div className="feature-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3>우리 아이 논술 전략 리포트</h3>
            <p>
              막막한 수리논술, 내 아이의 객관적인 실력을 확인하세요. 15장 분량의 심층 리포트로 대학 합격 가능성을 진단합니다.
            </p>
            <ul className="feature-list">
              <li>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                AI가 3초 만에 분석하는 학생 답안
              </li>
              <li>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                타겟 대학 맞춤형 학습 플랜
              </li>
              <li>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                개인별 취약점 완벽 분석
              </li>
            </ul>
          </div>

          {/* B2B Feature Card */}
          <div className="feature-card glass-panel card-b2b">
            <div className="feature-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3>학원 & 강사용 AI 채점 시스템</h3>
            <p>
              매년 바뀌는 논술 트렌드, 이제 일일이 채점하느라 밤새지 마세요. 퀘스티오 AI가 채점 시간을 80% 줄여드립니다.
            </p>
            <ul className="feature-list">
              <li>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                대량 답안 일괄 자동 채점 처리
              </li>
              <li>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                대학별 세부 평가 기준 완벽 반영
              </li>
              <li>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                에셋 스토어 최고 품질의 문제 구매
              </li>
            </ul>
          </div>

        </section>
      </main>

      {/* Footer (Toss Payments Review Requirement) */}
      <footer className="animate-fade-in delay-300 py-8 text-center text-sm text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col space-y-2">
          <p className="font-bold text-slate-800">상호명: 퀘스티오(Questio)</p>
          <p>
            사업자 형태: 개인사업자 | 사업자등록번호: 551-09-03449
          </p>
          <p>
            통신판매업 신고번호: 2026-인천미추홀-0365
          </p>
          <p>
            사업장 주소: 인천 미추홀구 숙골로 112번길 11. 507-1901
          </p>
          <p>
            이메일: help@questio.co.kr
          </p>
          <p className="mt-4 text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Questio. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
