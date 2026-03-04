import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="min-h-screen flex flex-col items-center justify-center p-8 bg-[#0c0a09] animate-in fade-in duration-1000">
    <div class="w-full max-w-xl space-y-12 text-center">
      <div class="space-y-4">
          <div class="inline-block px-4 py-1 bg-sky-500/10 border border-sky-500/20 rounded-full text-sky-400 text-[10px] font-black tracking-widest uppercase mb-4">
            Questio Project Asset Engine (Enterprise)
          </div>
          <h1 class="text-7xl font-black tracking-tighter text-white uppercase italic">
            Questio <span class="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500">AI</span>
          </h1>
          <p class="text-stone-500 font-bold uppercase tracking-tight text-xs">Cloud Native Exam Asset Management & Analysis</p>
      </div>

      <div class="bg-stone-900 border border-stone-800 p-10 rounded-[3rem] shadow-4xl space-y-8">
          <div class="space-y-3">
            <label class="text-[10px] font-black text-stone-500 uppercase tracking-widest block text-left ml-4">Service Access Key</label>
            <input
              type="password"
              [(ngModel)]="licenseKey"
              placeholder="ENTER ACCESS CODE"
              class="w-full px-8 py-5 bg-stone-950 border border-stone-800 rounded-3xl text-white outline-none focus:border-sky-500/50 transition-all text-center tracking-widest font-black"
              (keydown.enter)="verifyLicense()"
            />
          </div>
          <button
            (click)="verifyLicense()"
            class="w-full py-5 bg-white text-black font-black text-lg rounded-3xl hover:bg-stone-200 transition-all shadow-2xl shadow-white/5 uppercase"
          >
            Connect to Enterprise Storage
          </button>
      </div>
    </div>
  </div>
  `
})
export class LoginComponent {
  licenseKey = '';
  @Output() loginSuccess = new EventEmitter<boolean>();

  verifyLicense() {
    if (this.licenseKey === 'questio') {
      alert('Questio 프로젝트: 프리미엄 GCS 인프라가 활성화되었습니다.');
      this.loginSuccess.emit(true);
    } else if (this.licenseKey === 'GUEST') {
      this.loginSuccess.emit(false);
    } else {
      alert('유효하지 않은 인증 코드입니다.');
    }
  }
}
