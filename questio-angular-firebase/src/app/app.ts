import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LoginComponent, DashboardComponent],
  template: `
    <!-- 라우터 대신 MVP용 상태 기반 렌더링 -->
    <ng-container *ngIf="!isStarted">
      <app-login (loginSuccess)="onLogin($event)"></app-login>
    </ng-container>

    <ng-container *ngIf="isStarted">
      <app-dashboard [isVerified]="isVerified" (logout)="onLogout()"></app-dashboard>
    </ng-container>
  `
})
export class AppComponent {
  isStarted = false;
  isVerified = false;

  onLogin(success: boolean) {
    this.isVerified = success;
    this.isStarted = true;
  }

  onLogout() {
    this.isStarted = false;
    this.isVerified = false;
  }
}
