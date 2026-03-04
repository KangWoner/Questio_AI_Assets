import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface EvaluationState {
  total: number;
  completed: number;
  results: { [studentId: string]: import('../models/types').ReportResult };
  status: 'idle' | 'processing' | 'completed' | 'error';
}

@Injectable({
  providedIn: 'root'
})
export class EvaluationStateService {
  private initialState: EvaluationState = {
    total: 0,
    completed: 0,
    results: {},
    status: 'idle'
  };

  private stateSubj = new BehaviorSubject<EvaluationState>(this.initialState);
  state$ = this.stateSubj.asObservable();

  startEvaluation(totalStudents: number, students: import('../models/types').StudentData[]) {
    const initialResults: { [key: string]: import('../models/types').ReportResult } = {};
    students.forEach(s => {
      initialResults[s.id] = {
        studentId: s.id,
        studentName: s.name,
        status: 'loading',
        progressMessage: '분석 준비 중 (대기열)...'
      };
    });

    this.stateSubj.next({
      total: totalStudents,
      completed: 0,
      results: initialResults,
      status: 'processing'
    });
  }

  updateStudentProgress(studentId: string, updates: Partial<import('../models/types').ReportResult>) {
    const currentState = this.stateSubj.value;
    const currentStudentState = currentState.results[studentId];

    let newCompletedCount = currentState.completed;
    if (currentStudentState.status === 'loading' && (updates.status === 'done' || updates.status === 'error')) {
        newCompletedCount++;
    }

    this.stateSubj.next({
      ...currentState,
      completed: newCompletedCount,
      status: newCompletedCount === currentState.total ? 'completed' : 'processing',
      results: {
        ...currentState.results,
        [studentId]: {
          ...currentStudentState,
          ...updates
        }
      }
    });
  }

  reset() {
      this.stateSubj.next(this.initialState);
  }
}
