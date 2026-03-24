import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
// React.StrictMode는 개발 모드에서 효과를 두 번 실행하여 
// 불필요한 네트워크 요청 취소 오류를 유발할 수 있으므로 제거합니다.
root.render(
  <App />
);
