import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 1. 번역용 리소스 딕셔너리
const resources = {
  ko: {
    translation: {
      appName: "Dr. Han Essay Tutor",
      report: "분석 리포트",
      profile: "내 정보",
      greeting: "안녕하세요! 원장님의 초개인화 AI 논술/비문학 진단 튜터입니다.",
      inputPlaceholder: "여기에 원문을 붙여넣으세요",
      photoPlaceholder: "답안지 사진을 찍어 질문해보세요",
      // Profile Tab
      settings: "설정",
      language: "앱 언어",
      audience: "나의 연령대",
      audienceMiddle: "중학생 (쉽고 친절한 개념 설명)",
      audienceHigh: "고등학생 (논술/심화 입시 대비)"
    }
  },
  en: {
    translation: {
      appName: "Dr. Han Essay Tutor",
      report: "Report",
      profile: "Profile",
      greeting: "Hello! I am your hyper-personalized AI Essay Report Tutor.",
      inputPlaceholder: "Paste your essay here",
      photoPlaceholder: "Take a picture of your solution to ask",
      // Profile Tab
      settings: "Settings",
      language: "App Language",
      audience: "My Grade Level",
      audienceMiddle: "Middle School (Easy and friendly explanations)",
      audienceHigh: "High School (Advanced/Essay prep)"
    }
  },
  es: {
    translation: {
      appName: "Dr. Han Essay Tutor",
      report: "Reporte",
      profile: "Perfil",
      greeting: "¡Hola! Soy tu tutor de ensayo hiperpersonalizado.",
      inputPlaceholder: "Pega tu ensayo aquí",
      photoPlaceholder: "Toma una foto de tu respuesta para preguntar",
      // Profile Tab
      settings: "Ajustes",
      language: "Idioma de la aplicación",
      audience: "Mi Grado Escolar",
      audienceMiddle: "Escuela Secundaria (Explicaciones amigables)",
      audienceHigh: "Escuela Preparatoria (Avanzado)"
    }
  },
  ja: {
    translation: {
      appName: "Dr. Han Essay Tutor",
      report: "レポート",
      profile: "マイページ",
      greeting: "こんにちは！超パーソナライズされたAI小論文チューターです。",
      inputPlaceholder: "ここに小論文を貼り付けてください",
      photoPlaceholder: "解答用紙の写真を撮って質問してください",
      // Profile Tab
      settings: "設定",
      language: "アプリの言語",
      audience: "私の学年",
      audienceMiddle: "中学生（優しくて分かりやすい説明）",
      audienceHigh: "高校生（論述・大学入試対策）"
    }
  }
};

// 2. i18next 초기화
i18n
  .use(initReactI18next) // react-i18next를 i18next에 바인딩
  .init({
    resources,
    lng: "ko", // 초기 언어는 한국어로 설정
    fallbackLng: "en", // 언어 리소스가 없을 경우 기본값
    interpolation: {
      escapeValue: false // React는 이미 XSS를 방지하므로 escape 불필요
    }
  });

export default i18n;
