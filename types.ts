
export type ModelName = 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-3-flash-preview' | 'gemini-3-pro-preview';
export type ExamCategory = 'essay' | 'short-answer'; // 수리논술 vs 약술형 고사

export interface StudentData {
  id: string;
  name: string;
  email: string;
  solutionFiles: File[];
  reportTemplate: string;
}

export interface LinkedFile {
  name: string;
  url?: string;
  file?: File;
}

export interface FormData {
  category: ExamCategory; // 추가
  university: string;
  examYear: string;
  problemType: string;
  scoringCriteria: string;
  problemMaterials: LinkedFile[];
  scoringMaterials: LinkedFile[];
  students: StudentData[];
  model: ModelName;
}

export interface ReportData {
  htmlContent: string;
  studentEmail: string;
  studentName: string;
  examInfo: string;
  generationDate: string;
}

export interface FileContent {
  mimeType: string;
  data: string;
}

export interface ExamDatabaseRecord {
  category?: ExamCategory; // 구분용
  university: string;
  year: string;
  problemType: string;
  problemUrl: string;
  solutionUrl: string;
}

export interface ConceptWeakness {
  concept: string;
  category: string;
  count: number;
  details: string[];
}

export interface CoreCompetencyScores {
  problemSolving: number;
  writingAbility: number;
  calculationAccuracy: number;
}

export interface StudentRecord {
  id: string;
  date: string;
  examInfo: string;
  problemType?: string;
  totalScore: number;
  maxScore: number;
  weaknesses: string[];
  strengths: string[];
  conceptWeaknesses: ConceptWeakness[];
  coreCompetencies: CoreCompetencyScores;
  criteriaScores: {
    criterion: string;
    score: number;
    maxScore: number;
  }[];
}

export interface StudentHistory {
  studentId: string;
  studentName: string;
  studentEmail: string;
  records: StudentRecord[];
}
