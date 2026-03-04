
// Google Sheets 연동 서비스
// 배포된 Google Apps Script의 웹 앱 URL입니다.
const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycby3i2xADuARKKDBlgcId7Vksq1MnRVNYPUNAP4j_3Dut2oEN_SxJYekkkCVxf5mMQL7LQ/exec';

export interface SheetRecord {
  studentId: string;
  studentName: string;
  date: string;
  examInfo: string;
  totalScore: number;
  maxScore: number;
  conceptWeaknesses: any[];
  strengths: string[];
  coreCompetencies?: {
    problemSolving: number;
    writingAbility: number;
    calculationAccuracy: number;
  };
}

// 기록 저장하기 (POST)
export async function saveToGoogleSheets(record: SheetRecord): Promise<boolean> {
  try {
    const response = await fetch(SHEETS_API_URL, {
      method: 'POST',
      mode: 'no-cors', // no-cors는 응답 내용을 읽을 수 없으나 전송은 가능합니다.
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(record),
    });
    
    console.log('✅ Google Sheets 저장 요청 완료');
    return true;
  } catch (error) {
    console.error('❌ Google Sheets 저장 실패:', error);
    return false;
  }
}

// 학생 기록 불러오기 (GET)
// 이 함수를 통해 다른 컴퓨터에서도 동일한 studentId로 데이터를 조회할 수 있습니다.
export async function getFromGoogleSheets(studentId: string): Promise<SheetRecord[]> {
  try {
    const url = `${SHEETS_API_URL}?studentId=${encodeURIComponent(studentId)}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('네트워크 응답이 올바르지 않습니다.');
    }
    
    const data = await response.json();
    
    // API 응답 구조에 따라 배열로 변환하여 반환
    if (Array.isArray(data)) {
      return data;
    } else if (data && typeof data === 'object' && data.records) {
      return data.records;
    }
    
    return [];
  } catch (error) {
    console.error('❌ Google Sheets 데이터 불러오기 실패:', error);
    // 실패 시 로컬 데이터를 사용할 수 있도록 빈 배열 반환
    return [];
  }
}
