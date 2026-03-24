import React, { useState, useEffect } from 'react';
import { getQuestions } from '../../firebase';
import type { QuestionData } from '../../firebase';
import { Search, Loader2, BookOpen, ChevronRight, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const UNIVERSITIES = ['전체', '연세대학교', '고려대학교', '성균관대학교', '한양대학교', '서강대학교', '가톨릭대학교'];

export default function SearchContainer() {
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedUniv, setSelectedUniv] = useState<string>('전체');
  const isFetchingRef = React.useRef(false); // 이벤트 루프 레이스 컨디션 방지
  
  const navigate = useNavigate();

  const fetchQuestions = async (isLoadMore = false) => {
    if (loading || isFetchingRef.current || (!hasMore && isLoadMore)) return;
    
    setLoading(true);
    isFetchingRef.current = true;

    const filter = selectedUniv !== '전체' ? selectedUniv : undefined;
    const currentLastDoc = isLoadMore ? lastDoc : null;
    
    try {
      const result = await getQuestions(currentLastDoc, 15, filter);
      
      if (isLoadMore) {
        setQuestions(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNewItems = result.data.filter(item => !existingIds.has(item.id));
          return [...prev, ...uniqueNewItems];
        });
      } else {
        setQuestions(result.data);
      }
      
      setLastDoc(result.lastDoc);
      setHasMore(result.data.length === 15);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    setQuestions([]);
    setLastDoc(null);
    setHasMore(true);
    fetchQuestions(false);
  }, [selectedUniv]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop <= e.currentTarget.clientHeight + 100;
    if (bottom) {
      fetchQuestions(true);
    }
  };

  const handleStartChat = (q: QuestionData) => {
    // 임시: 채팅 라우터로 문항 데이터를 넘기거나 ID 파라미터 전달
    navigate('/chat', { state: { question: q } });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="pt-8 pb-4 px-5 bg-white border-b border-slate-100 z-10 sticky top-0">
        <h1 className="text-2xl font-black tracking-tight text-slate-800 mb-4">기출문제 탑색</h1>
        
        {/* Search Bar */}
        <div className="relative flex items-center bg-slate-100 rounded-2xl px-4 py-3 mb-4">
          <Search className="w-5 h-5 text-slate-400 mr-2" />
          <input 
            type="text" 
            placeholder="어떤 문제를 찾으시나요?" 
            className="bg-transparent outline-none w-full text-base text-slate-800 placeholder:text-slate-400"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide pb-2 -mx-5 px-5">
          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full flex-shrink-0">
            <Filter className="w-4 h-4 text-slate-500 text-sm" />
          </div>
          {UNIVERSITIES.map(univ => (
            <button
              key={univ}
              onClick={() => setSelectedUniv(univ)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-bold transition-all ${
                selectedUniv === univ 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {univ}
            </button>
          ))}
        </div>
      </div>

      {/* List Area */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex-1 overflow-y-auto p-4 space-y-4" 
        onScroll={handleScroll}
      >
        {questions.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 space-y-3">
            <BookOpen className="w-10 h-10 opacity-20" />
            <p className="text-sm">등록된 기출문제가 없습니다.</p>
          </div>
        )}

        {questions.map((q) => (
          <motion.div 
            variants={itemVariants}
            key={q.id} 
            onClick={() => handleStartChat(q)} 
            className="bg-white rounded-[1.2rem] p-5 shadow-sm border border-slate-100 active:scale-[0.98] transition-transform cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-wider rounded-lg">
                  {q.university}
                </span>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-lg">
                  {q.year}
                </span>
              </div>
              {q.questionLink && (
                <div className="w-6 h-6 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              )}
            </div>
            
            <h3 className="font-bold text-[15px] leading-snug text-slate-800 dark:text-slate-100 line-clamp-2">
              {q.title}
            </h3>
            
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(q.tags || []).slice(0,3).map(tag => (
                <span key={tag} className="text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">
                  #{tag}
                </span>
              ))}
            </div>
          </motion.div>
        ))}

        {loading && (
          <div className="flex justify-center p-4">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        )}
      </motion.div>
    </div>
  );
}
