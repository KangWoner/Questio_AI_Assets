import React, { useState, useRef, useEffect } from 'react';
import { Send, Camera as ImageIcon, ChevronLeft, Bot, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { auth, db } from '../../firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  imageUrl?: string;
  isTyping?: boolean;
}

export default function ChatContainer() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  // location.state.question 에는 Search에서 넘겨준 선택된 문항 정보가 담깁니다.
  const questionContext = location.state?.question;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: questionContext 
        ? `"${questionContext.title}" 문제에 대해 질문이 있으신가요? 제가 튜터로서 끝까지 도와드리겠습니다!`
        : t('greeting'),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 학원 이름 
  const [academyName, setAcademyName] = useState<string>('');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    const fetchAcademyName = async () => {
      try {
        const q = query(collection(db, 'academySettings'), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data();
          if (docData.name) {
            setAcademyName(docData.name);
          }
        }
      } catch (error) {
        console.error('Failed to fetch academy name', error);
      }
    };
    fetchAcademyName();
  }, []);

  const handleSend = async (overrideText?: string | React.MouseEvent) => {
    const textToSend = typeof overrideText === 'string' ? overrideText : inputText;
    if ((!textToSend.trim() && !selectedImage) || isTyping) return;
    
    const userText = textToSend.trim() || '사진을 전송했습니다. 확인해주세요.';
    const userMsg: Message = { 
      id: Date.now().toString(), 
      sender: 'user', 
      text: userText,
      ...(selectedImage ? { imageUrl: selectedImage } : {}) 
    };
    
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setSelectedImage(null);
    setIsTyping(true);
    
    try {
      const contents = newMessages.map(msg => {
        const parts: any[] = [{ text: msg.text }];
        if (msg.imageUrl) {
          const [prefix, base64Data] = msg.imageUrl.split(',');
          const mimeType = prefix.match(/:(.*?);/)?.[1] || 'image/jpeg';
          parts.push({
            inlineData: { data: base64Data, mimeType }
          });
        }
        return {
          role: msg.sender === 'ai' ? 'model' : 'user',
          parts
        };
      });
      
      if (contents.length > 0 && contents[0].role === 'model') {
        contents.unshift({ role: 'user', parts: [{ text: '안녕하세요, 선생님. 이 문제 질문하겠습니다.' }] });
      }

      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('로그인이 필요합니다.');



      let endpoint = '/api/chatAgent';
      let payload: any = { query: userText };

      if (selectedImage) {
          // Both cases handled via proxy
          const [prefix, base64Data] = selectedImage.split(',');
          const mimeType = prefix.match(/:(.*?);/)?.[1] || 'image/jpeg';
          payload = {
              imageBase64: base64Data,
              mimeType: mimeType,
              questionContext: userText
          };
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
          try {
              const errData = await response.json();
              throw new Error(`API 오류 (${response.status}): ${errData.error || JSON.stringify(errData)}`);
          } catch(e: any) {
              if (e.message.startsWith('API 오류')) throw e;
              throw new Error(`API 오류: ${response.status}`);
          }
      }
      const data = await response.json();
      
      // Agent Builder 응답 구조체에서 요약된 답변 추출 또는 Gemini 텍스트 응답 추출
      let answerText = '응답을 생성할 수 없습니다.';
      if (data.text) {
          answerText = data.text;
      } else if (data.summary && data.summary.summaryText) {
          answerText = data.summary.summaryText;
      } else if (data.results && data.results.length > 0) {
          const snippet = data.results[0].document?.derivedStructData?.extractiveAnswers?.[0]?.content 
                        || data.results[0].document?.derivedStructData?.snippets?.[0]?.snippet;
          if (snippet) answerText = snippet.replace(/<[^>]*>?/gm, ''); // HTML 제거
      }
      
      const aiMsg: Message = { id: (Date.now() + 1).toString(), sender: 'ai', text: answerText };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      console.error('Chat Error:', error);
      let errorMsg = '일시적인 서버 오류가 발생했습니다. 잠시 후 다시 질문해주세요.';
      if (error.message.includes('Q-Token')) {
          errorMsg = '튜터링을 진행할 수 있는 Q-Token이 모두 소진되었습니다.';
      } else if (error.message) {
          errorMsg = error.message;
      }
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ai', text: errorMsg }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;
          if (width > maxDim || height > maxDim) {
              if (width > height) {
                  height = Math.round((height * maxDim) / width);
                  width = maxDim;
              } else {
                  width = Math.round((width * maxDim) / height);
                  height = maxDim;
              }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setSelectedImage(compressedBase64);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
    // 동일 파일 재선택을 위해 value 초기화
    if (e.target) e.target.value = '';
  };

  const formatMath = (text: string) => {
    return text
      .replace(/¿/g, '?')
      .replace(/\\\(/g, '$')
      .replace(/\\\)/g, '$')
      .replace(/\\\[/g, '$$$')
      .replace(/\\\]/g, '$$$');
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAFC] text-gray-900 font-sans">
      {/* Premium Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/70 backdrop-blur-xl border-b border-gray-100/50 z-20 sticky top-0 shadow-sm">
        <button 
          onClick={() => navigate(-1)} 
          aria-label="뒤로가기"
          className="p-2 -ml-2 rounded-full text-gray-600 hover:bg-gray-100 transition"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <div className="flex flex-col items-center">
          <div className="flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <h1 className="text-[16px] font-bold text-gray-900 tracking-tight">
              {academyName ? `${academyName} AI 튜터` : 'Questio AI 튜터'}
            </h1>
          </div>
          {questionContext && (
            <p className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[200px] font-medium">
              {questionContext.university} {questionContext.year}
            </p>
          )}
        </div>
        
        <div className="w-10" /> {/* Balance for back button */}
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* Avatar for AI */}
              {msg.sender === 'ai' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-3 mt-1 shadow-md shadow-blue-500/20">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}

              {/* Message Bubble */}
              <div 
                className={`px-4 py-3 rounded-[1.25rem] text-[15px] leading-[1.6] shadow-sm overflow-x-auto ${
                  msg.sender === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-[4px]' 
                  : 'bg-white border border-gray-100 text-gray-800 rounded-tl-[4px]'
                }`}
              >
                {msg.imageUrl && (
                  <img src={msg.imageUrl} alt="attached" className="max-w-full rounded-lg mb-2 max-h-[250px] object-contain shadow-sm border border-white/20" />
                )}
                {msg.sender === 'user' ? (
                  <span className="whitespace-pre-wrap">{formatMath(msg.text)}</span>
                ) : (
                  <div className="prose-chat prose-math text-[15px]">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {formatMath(msg.text)}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Typing Indicator */}
      {isTyping && (
        <div className="px-4 py-2 flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="bg-white border border-gray-100 px-4 py-3 rounded-[1.25rem] rounded-tl-[4px] shadow-sm">
            <div className="flex space-x-1.5 items-center h-4">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}
        <div ref={bottomRef} className="h-2" />
      </div>

      {/* Glassmorphism Premium Input Area */}
      <div className="relative border-t border-gray-100/80 bg-white/70 backdrop-blur-xl pb-safe pt-2 px-4 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] z-20">
        
        {/* Suggestion Chips */}
        {messages.length === 1 && !isTyping && (
          <div className="flex space-x-2 overflow-x-auto pb-3 pt-1 scrollbar-hide">
            {['💡 이 문제는 어디서부터 시작해?', '💡 사용된 핵심 수학 개념이 뭘까?', '💡 채팅 추천 질문'].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip)}
                className="whitespace-nowrap flex-shrink-0 px-3.5 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[13px] font-medium border border-blue-100 hover:bg-blue-100 transition shadow-sm active:scale-95"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Image Preview Overlay */}
        {selectedImage && (
          <div className="absolute -top-24 left-4 bg-white border border-gray-200 rounded-xl p-1.5 shadow-lg w-20 h-20 group">
            <button 
              onClick={() => setSelectedImage(null)}
              aria-label="이미지 첨부 취소"
              className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold z-10 hover:bg-slate-700 transition"
            >
              ✕
            </button>
            <img src={selectedImage} alt="preview" className="w-full h-full object-cover rounded-lg" />
          </div>
        )}

        <div className="flex items-end space-x-2 max-w-4xl mx-auto pb-3">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImageSelect} 
            aria-label="이미지 첨부"
          />
          <button 
            className="p-2.5 text-blue-500 hover:bg-blue-50 transition rounded-full flex-shrink-0"
            aria-label="이미지 업로드"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          
          <div className="flex-1 bg-gray-100/80 border border-gray-200/50 rounded-2xl flex items-end">
            <input
              type="text"
              aria-label="메시지 입력란"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedImage ? t('photoPlaceholder') : t('inputPlaceholder')} 
              className="w-full bg-transparent outline-none px-4 py-3.5 text-[15px] text-gray-900 placeholder:text-gray-400"
            />
            <button 
              onClick={handleSend}
              aria-label="메시지 전송"
              disabled={!inputText.trim() && !selectedImage}
              className={`p-2.5 m-1 rounded-full transition-all flex-shrink-0 ${
                inputText.trim() 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20' 
                : 'bg-gray-100 text-gray-400'
              }`}
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
      
    </div>
  );
}
