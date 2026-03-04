import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { delay, concatMap, tap, catchError } from 'rxjs/operators';
import { EvaluationStateService } from './evaluation-state.service';
import { FormData, StudentData, ReportData } from '../models/types';

// TODO: When integrating actual Firebase:
// import { Functions, httpsCallable } from '@angular/fire/functions';

@Injectable({
  providedIn: 'root'
})
export class AiEvaluationService {
  constructor(
    private stateService: EvaluationStateService,
    // private functions: Functions // Inject Firebase Functions here
  ) {}

  /**
   * Non-blocking Queue implementation using RxJS concatMap
   * Processes one student at a time via Cloud Function call to prevent Browser Freezing
   * while handling up to hundreds of students in a batch.
   */
  processBatchEvaluations(formData: FormData) {
    const students = formData.students;
    const examInfo = `${formData.university} ${formData.examYear} ${formData.problemType}`.trim();

    this.stateService.startEvaluation(students.length, students);

    // `from(students)` creates a stream of students.
    // `concatMap` ensures the next cloud function call waits for the previous one to complete,
    // avoiding overloading the network/browser.
    from(students).pipe(
      concatMap(student => this.callCloudFunction(student, formData, examInfo))
    ).subscribe({
      complete: () => console.log('All batch processing complete (Cloud Queue Empty).'),
      error: (err) => console.error('Batch processing global error:', err)
    });
  }

  // Calls the actual 'evaluateStudentSolution' Firebase Function
  private callCloudFunction(student: StudentData, formData: FormData, examInfo: string): Observable<any> {
    this.stateService.updateStudentProgress(student.id, { progressMessage: '서버 큐 대기 중...' });

    // ===========================================================================
    // TODO: Production Code for Firebase Callable Function
    // ===========================================================================
    // const evaluateFn = httpsCallable<{studentData: any, formData: any, examInfo: string}, ReportData>(
    //    this.functions, 'evaluateStudentSolution'
    // );
    //
    // return from(evaluateFn({ studentData: student, formData, examInfo })).pipe(
    //    tap(response => {
    //        const reportData = response.data; // Strongly typed JSON from Cloud Function
    //        this.stateService.updateStudentProgress(student.id, {
    //            status: 'done', data: reportData, progressMessage: '완료'
    //        });
    //    }),
    //    catchError(err => {
    //        this.stateService.updateStudentProgress(student.id, { status: 'error', progressMessage: '채점 실패' });
    //        return of(null); // Continue queue even if one fails
    //    })
    // );
    // ===========================================================================

    // --- Mock Implementation for Sandbox Demonstration ---
    return of(student).pipe(
      tap(() => this.stateService.updateStudentProgress(student.id, { progressMessage: '클라우드 AI 채점 엔진 가동...' })),
      delay(2000), // Simulate Network
      tap(() => this.stateService.updateStudentProgress(student.id, { progressMessage: '논리 구조 분석 및 JSON 생성 중...' })),
      delay(2500), // Simulate AI Processing Time
      tap(() => {
        const generationDate = new Date().toLocaleString('ko-KR');
        const mockReportData: ReportData = {
          htmlContent: `<div class="p-4 border rounded text-stone-200">
             <h3 class="text-xl font-bold mb-2">🔥 ${student.name} 학생 분석 결과 (JSON 기반)</h3>
             <p><strong>총점:</strong> 85/100</p>
             <p><strong>강점:</strong> 논리 전개가 명확함.</p>
             <p><strong>보완점:</strong> 수식 도출 과정 생략.</p>
          </div>`,
          studentEmail: student.email,
          studentName: student.name,
          examInfo: examInfo,
          generationDate: generationDate
        };

        this.stateService.updateStudentProgress(student.id, {
          status: 'done',
          data: mockReportData,
          progressMessage: '완료'
        });
      }),
      catchError(err => {
        this.stateService.updateStudentProgress(student.id, { status: 'error', progressMessage: '채점 실패' });
        return of(null); // Ensure queue continues
      })
    );
  }
}
