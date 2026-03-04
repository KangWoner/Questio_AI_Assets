import React, { useState, useEffect, useRef } from 'react';
import type { ReportData } from '../types';
import { DocumentIcon } from './icons/DocumentIcon';
import { EmailIcon } from './icons/EmailIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { PdfIcon } from './icons/PdfIcon';
import { HwpIcon } from './icons/HwpIcon';

interface ReportDisplayProps {
  reportData: ReportData;
}

declare const html2pdf: any;
declare global {
  interface Window {
    MathJax: any;
  }
}

export const ReportDisplay: React.FC<ReportDisplayProps> = ({ reportData }) => {
  const { htmlContent, studentEmail, studentName, examInfo, generationDate } = reportData;
  const [hwpCopyStatus, setHwpCopyStatus] = useState('HWP 복사');
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // MathJax Typesetting Logic
    const renderMath = () => {
      if (window.MathJax && window.MathJax.typesetPromise && reportRef.current) {
        window.MathJax.typesetPromise([reportRef.current])
          .then(() => {
             // Typesetting complete
          })
          .catch((err: any) => console.error('MathJax typeset failed: ', err));
      } else {
         // Retry if MathJax is not yet loaded
         setTimeout(renderMath, 100);
      }
    };

    // Small delay to ensure DOM is ready
    setTimeout(renderMath, 50);
  }, [htmlContent]);

  const createSafeFilename = (extension: 'html' | 'pdf') => {
    const sanitize = (text: string) => 
      text.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣_.-]/g, '');
    
    const safeStudentName = sanitize(studentName);
    const safeExamInfo = sanitize(examInfo);
    
    return `${safeExamInfo}_${safeStudentName}_평가보고서.${extension}`;
  };

  const handleSave = () => {
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>평가 보고서 - ${studentName}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>body { background-color: #1c1917; }</style>
         <script>
            window.MathJax = {
                tex: { 
                  inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
                  displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']]
                },
                svg: { fontCache: 'global' }
            };
        </script>
        <script type="text/javascript" id="MathJax-script" async
            src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js">
        </script>
      </head>
      <body class="p-8">
        ${htmlContent}
      </body>
      </html>
    `;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = createSafeFilename('html');
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>평가 보고서 - ${studentName}</title>
          <script src="https://cdn.tailwindcss.com"></script>
           <style>
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
          <script>
            window.MathJax = {
                tex: { 
                  inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
                  displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']]
                },
                svg: { fontCache: 'global' }
            };
          </script>
          <script type="text/javascript" id="MathJax-script" async
            src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js">
          </script>
        </head>
        <body class="bg-white p-8 font-sans">
          ${htmlContent.replace(/bg-stone-\d{2,3}|text-stone-\d{2,3}|border-stone-\d{2,3}/g, '')}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.focus();
        setTimeout(() => printWindow.print(), 1000);
      };
    }
  };
  
  const handleSaveAsPdf = () => {
    const element = document.createElement('div');
    element.innerHTML = `
      <div class="p-8 bg-stone-900">${htmlContent}</div>
    `;
    document.body.appendChild(element);

    // Helper function to generate PDF after potential MathJax rendering
    function generatePdf(el: HTMLElement) {
        if (!el) return;
        const filename = createSafeFilename('pdf');
        const opt = {
            margin:       [0.5, 0.5, 0.5, 0.5], // inches
            filename:     filename,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#1c1917' },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        
        html2pdf().from(el).set(opt).save().then(() => {
            document.body.removeChild(el);
        });
    }
    
    if (window.MathJax) {
        window.MathJax.typesetPromise([element]).then(() => {
            generatePdf(element);
        }).catch(() => {
             generatePdf(element);
        });
    } else {
        generatePdf(element);
    }
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`${studentName}님 수리논술 평가 보고서`);
    const body = encodeURIComponent(
        `안녕하세요, ${studentName}님.\n\n요청하신 ${examInfo} 수리논술 평가 보고서를 전달드립니다.\n\n파일을 다운로드하여 확인해주세요.\n\n감사합니다.`
    );
    window.location.href = `mailto:${studentEmail}?subject=${subject}&body=${body}`;
  };

  const handleCopyToHwp = async () => {
    if (!navigator.clipboard?.write) {
        alert('클립보드 쓰기 기능이 지원되지 않는 환경입니다.');
        setHwpCopyStatus('실패');
        setTimeout(() => setHwpCopyStatus('HWP 복사'), 2000);
        return;
    }

    try {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const clipboardItem = new ClipboardItem({ 'text/html': blob });
        await navigator.clipboard.write([clipboardItem]);
        setHwpCopyStatus('복사됨!');
        setTimeout(() => setHwpCopyStatus('HWP 복사'), 2000);
    } catch (err) {
        console.error('Failed to copy HTML for HWP: ', err);
        setHwpCopyStatus('실패');
        alert('클립보드에 복사하지 못했습니다.');
        setTimeout(() => setHwpCopyStatus('HWP 복사'), 2000);
    }
  };

  return (
    <div className="bg-stone-900/20">
      <div className="p-4 border-b border-stone-700 flex justify-between items-center flex-wrap gap-y-2">
        <div>
           <p className="text-sm text-stone-400">생성일: {generationDate}</p>
        </div>
        <div className="flex items-center space-x-2">
           <button
            onClick={handleSave}
            title="HTML로 저장"
            className="flex items-center px-3 py-2 text-sm font-medium text-stone-300 bg-stone-700/50 rounded-md hover:bg-stone-700 transition"
          >
            <DocumentIcon className="w-4 h-4 mr-2" />
            HTML
          </button>
           <button
            onClick={handleSaveAsPdf}
            title="PDF로 저장"
            className="flex items-center px-3 py-2 text-sm font-medium text-stone-300 bg-stone-700/50 rounded-md hover:bg-stone-700 transition"
          >
            <PdfIcon className="w-4 h-4 mr-2" />
            PDF
          </button>
          <button
            onClick={handleCopyToHwp}
            title="클립보드에 복사 (HWP 붙여넣기용)"
            className="flex items-center px-3 py-2 text-sm font-medium text-stone-300 bg-stone-700/50 rounded-md hover:bg-stone-700 transition"
          >
            <HwpIcon className="w-4 h-4 mr-2" />
            {hwpCopyStatus}
          </button>
           <button
            onClick={handlePrint}
            title="인쇄"
            className="flex items-center px-3 py-2 text-sm font-medium text-stone-300 bg-stone-700/50 rounded-md hover:bg-stone-700 transition"
          >
            <PrinterIcon className="w-4 h-4 mr-2" />
            인쇄
          </button>
          <button
            onClick={handleEmail}
            title="이메일 보내기"
            className="flex items-center px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-fuchsia-600 rounded-md hover:opacity-90 transition"
          >
            <EmailIcon className="w-4 h-4 mr-2" />
            이메일
          </button>
        </div>
      </div>
      <div 
        id="report-content"
        ref={reportRef}
        className="p-6"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
};