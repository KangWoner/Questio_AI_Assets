export interface LinkedFile {
  name: string;
  url: string;
}

export interface StudentData {
  id: string;
  name: string;
  email: string;
  solutionFiles: LinkedFile[];
  reportTemplate: 'A' | 'B';
}

export interface FormData {
  university: string;
  examYear: string;
  problemType: string;
  category: 'essay' | 'simple';
  model: string;
  scoringCriteria: string;
  problemMaterials: LinkedFile[];
  scoringMaterials: LinkedFile[];
  students: StudentData[];
}

export interface ReportData {
  htmlContent: string;
  studentEmail: string;
  studentName: string;
  examInfo: string;
  generationDate: string;
}

export interface ReportResult {
  studentId: string;
  studentName: string;
  status: 'loading' | 'done' | 'error';
  data?: ReportData;
  error?: string;
  progressMessage?: string;
}

export interface ExamDatabaseRecord {
  university: string;
  year: string;
  problemType: string;
  problemUrl?: string;
  solutionUrl?: string;
}
