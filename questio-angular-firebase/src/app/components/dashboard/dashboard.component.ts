import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationStateService } from '../../services/evaluation-state.service';
import { AiEvaluationService } from '../../services/ai-evaluation.service';
import { ExamDataService } from '../../services/exam-data.service';
import { FormData } from '../../models/types';
import { Observable } from 'rxjs';
import { EvaluationState } from '../../services/evaluation-state.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen w-full font-sans flex flex-col bg-[#0c0a09] text-stone-300 animate-in fade-in duration-500">
      <!-- 헤더 (생략: 기존 코드와 동일) -->
      <header class="sticky top-0 z-10 bg-[#0c0a09]/80 backdrop-blur-3xl border-b border-stone-800/40 p-6 flex justify-between">
        <div class="text-2xl font-black text-white italic uppercase">Questio <span class="text-sky-500">AI</span></div>
        <button (click)="logout.emit()" class="text-xs text-stone-400 hover:text-white uppercase tracking-widest font-bold">Logout</button>
      </header>

      <main class="container mx-auto p-10 grid grid-cols-1 xl:grid-cols-12 gap-12 flex-grow items-start max-w-[1600px]">
        <!-- 폼 영역 (간소화 모형) -->
        <div class="xl:col-span-5 lg:sticky top-36 bg-stone-900/60 p-8 rounded-[3rem] border border-stone-800/50">
          <h2 class="text-xl font-black text-stone-100 uppercase mb-6">Exam Configuration</h2>
          <div class="space-y-4">
            <h3 class="text-sm font-black text-stone-400 uppercase">1. Upload Database (CSV)</h3>
            <input type="file" #csvFileInput accept=".csv" (change)="onCsvUpload($event)" class="block w-full text-sm text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-sky-600/20 file:text-sky-400 hover:file:bg-sky-600/30 transition-all cursor-pointer">
            <p *ngIf="uploadStatus" class="text-xs font-bold" [ngClass]="{'text-green-400': uploadStatus.includes('성공'), 'text-red-400': uploadStatus.includes('오류')}">{{ uploadStatus }}</p>
          </div>

          <div class="mt-12 space-y-4">
            <h3 class="text-sm font-black text-stone-400 uppercase">2. AI Evaluation Queue</h3>
            <button
               (click)="startBatchEvaluation()"
               [disabled]="(evalState$ | async)?.status === 'processing'"
               class="w-full py-4 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-2xl shadow-xl shadow-sky-900/30 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-all">
               {{ (evalState$ | async)?.status === 'processing' ? 'Processing...' : 'Execute Questio-Engine' }}
            </button>
            <p class="text-xs text-stone-500 mt-2">* 이 버튼은 현재 Angular의 RxJS 기반 큐 시스템을 테스트합니다 (브라우저 프리징 없음).</p>
          </div>
        </div>

        <!-- 결과 프로그레스 영역 (핵심 - RxJS 구독) -->
        <div class="xl:col-span-7 space-y-10">
          <ng-container *ngIf="evalState$ | async as state">
             <div *ngIf="state.total > 0" class="bg-stone-900/40 border border-stone-800/50 rounded-[4rem] shadow-4xl overflow-hidden backdrop-blur-3xl">
                <div class="p-12 border-b border-stone-800/50 bg-stone-900/60 flex justify-between items-end">
                   <div>
                      <h2 class="text-3xl font-black text-stone-100 tracking-tighter uppercase">Questio Analysis Panel</h2>
                      <p class="text-xs text-stone-500 font-bold mt-2 uppercase tracking-widest tracking-tighter">Processing batch job for {{ state.total }} candidates</p>
                   </div>
                   <div class="px-6 py-2 bg-sky-500/10 rounded-2xl border border-sky-500/20 text-xs font-black text-sky-400 uppercase tracking-widest">
                     {{ state.completed }} / {{ state.total }} READY
                   </div>
                </div>

                <div class="p-10 space-y-8">
                   <!-- Object.values 흉내내기: Angular 템플릿에서는 KeyValue 파이프 사용 -->
                   <details *ngFor="let result of getResultsList(state.results)"
                            class="bg-stone-900/80 border border-stone-800/40 rounded-[2.5rem] overflow-hidden group transition-all"
                            [open]="result.status !== 'loading'">
                      <summary class="p-8 flex justify-between items-center cursor-pointer hover:bg-stone-800/30 transition-all list-none select-none">
                         <div class="flex items-center space-x-6">
                            <div class="w-16 h-16 rounded-3xl bg-stone-950 border border-stone-800 flex items-center justify-center font-black text-stone-400 text-2xl group-open:text-sky-400 group-open:border-sky-500/20 transition-all shadow-inner">
                              {{ result.studentName | slice:0:1 }}
                            </div>
                            <div>
                              <p class="font-black text-stone-100 text-xl tracking-tight">{{ result.studentName }}</p>
                              <p class="text-[10px] text-stone-600 uppercase font-black tracking-[0.2em] mt-1">{{ result.status === 'done' ? 'Intelligence Report Ready' : 'Analyzing Logic' }}</p>
                            </div>
                         </div>
                         <div class="flex items-center gap-6">
                            <!-- 로딩 텍스트 -->
                            <div *ngIf="result.status === 'loading'" class="flex items-center space-x-4 px-5 py-2.5 bg-stone-950/80 rounded-2xl border border-stone-800">
                               <span class="text-[10px] text-sky-400 font-black uppercase tracking-widest animate-pulse">{{ result.progressMessage }}</span>
                            </div>
                            <div *ngIf="result.status === 'done'" class="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center text-green-500 font-bold">✓</div>
                         </div>
                      </summary>
                      <!-- 결과 표시부 -->
                      <div class="border-t border-stone-800/40 bg-stone-950/40 p-8" *ngIf="result.status === 'done' && result.data">
                          <div [innerHTML]="result.data.htmlContent"></div>
                      </div>
                   </details>
                </div>
             </div>

             <!-- 아직 시작 안했을 때 -->
             <div *ngIf="state.total === 0" class="flex flex-col items-center justify-center h-full min-h-[400px] border-2 border-dashed border-stone-800/50 rounded-[4rem] bg-stone-900/10">
                <p class="text-stone-500 font-black uppercase tracking-widest">Waiting for batch execution...</p>
             </div>
          </ng-container>
        </div>
      </main>
    </div>
  `
})
export class DashboardComponent {
  @Input() isVerified = false;
  @Output() logout = new EventEmitter<void>();

  evalState$: Observable<EvaluationState>;
  uploadStatus: string = '';

  private examDataService = inject(ExamDataService);

  constructor(
    private stateService: EvaluationStateService,
    private aiEvalService: AiEvaluationService
  ) {
    this.evalState$ = this.stateService.state$;
  }

  onCsvUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.uploadStatus = '업로드 중... (Firestore 기록 중)';

      this.examDataService.uploadCsvData(file).subscribe({
        next: (result) => {
          this.uploadStatus = result.message;
          input.value = ''; // Reset file input
        },
        error: (err) => {
          this.uploadStatus = `업로드 오류: ${err.message}`;
          input.value = ''; // Reset file input
        }
      });
    }
  }

  // 모의 폼 데이터와 5명의 가상 학생 리스트
  mockFormData: FormData = {
    university: '연세대학교', examYear: '2024', problemType: '자연계열 오전', category: 'essay', model: 'gemini-pro', scoringCriteria: '', problemMaterials: [], scoringMaterials: [],
    students: [
      { id: '1', name: '김철수', email: '', solutionFiles: [], reportTemplate: 'A' },
      { id: '2', name: '이영희', email: '', solutionFiles: [], reportTemplate: 'A' },
      { id: '3', name: '박지성', email: '', solutionFiles: [], reportTemplate: 'A' },
      { id: '4', name: '최동원', email: '', solutionFiles: [], reportTemplate: 'A' },
      { id: '5', name: '홍길동', email: '', solutionFiles: [], reportTemplate: 'A' },
    ]
  };

  startBatchEvaluation() {
    // 멈춤 현상(Freezing) 없이 RxJS 스트림을 통해 백그라운드 처리 시뮬레이션
    this.aiEvalService.processBatchEvaluations(this.mockFormData);
  }

  getResultsList(resultsObj: any): import('../../models/types').ReportResult[] {
    return Object.values(resultsObj);
  }
}
