import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ExecutionStep } from '../../models/aura.models';

@Component({
    selector: 'app-execution-trace',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    template: `
    <div class="trace-container glass-panel">
      <div class="trace-header">
        <mat-icon>terminal</mat-icon>
        <span>Execution Trace</span>
      </div>
      <div class="trace-steps">
        @for (step of steps; track step.step) {
          <div class="trace-step" [class]="step.status">
            <div class="step-indicator">
              <div class="step-dot"></div>
              @if (!$last) { <div class="step-line"></div> }
            </div>
            <div class="step-content">
              <div class="step-label">Step {{ step.step }}: {{ step.label }}</div>
              <div class="step-value">{{ step.value }}</div>
            </div>
            <div class="step-status">
              @if (step.status === 'completed') { <mat-icon class="success-icon">check_circle</mat-icon> }
              @if (step.status === 'warning') { <mat-icon class="warn-icon">warning</mat-icon> }
              @if (step.status === 'blocked') { <mat-icon class="error-icon">block</mat-icon> }
              @if (step.status === 'pending') { <div class="pulse-dot"></div> }
            </div>
          </div>
        }
      </div>
    </div>
  `,
    styles: [`
    .trace-container {
      padding: 16px;
      margin-top: 12px;
      font-family: 'Roboto Mono', monospace;
      font-size: 0.9rem;
    }
    .trace-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      color: rgba(255,255,255,0.7);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-size: 0.8rem;
    }
    .trace-steps {
      display: flex;
      flex-direction: column;
    }
    .trace-step {
      display: flex;
      gap: 16px;
      min-height: 50px;
    }
    .step-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 12px;
    }
    .step-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(255,255,255,0.3);
      margin-top: 6px;
    }
    .step-line {
      width: 2px;
      flex-grow: 1;
      background: rgba(255,255,255,0.1);
    }
    .trace-step.completed .step-dot { background: #4caf50; }
    .trace-step.warning .step-dot { background: #ff9800; }
    .trace-step.blocked .step-dot { background: #f44336; }
    .trace-step.pending .step-dot { background: #2196f3; }

    .step-content {
      flex-grow: 1;
      padding-bottom: 12px;
    }
    .step-label {
      color: rgba(255,255,255,0.5);
      font-size: 0.75rem;
    }
    .step-value {
      color: rgba(255,255,255,0.9);
      margin-top: 2px;
    }
    .success-icon { color: #4caf50; font-size: 18px; width: 18px; height: 18px; }
    .warn-icon { color: #ff9800; font-size: 18px; width: 18px; height: 18px; }
    .error-icon { color: #f44336; font-size: 18px; width: 18px; height: 18px; }

    .pulse-dot {
      width: 8px;
      height: 8px;
      background: #2196f3;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(33, 150, 243, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(33, 150, 243, 0); }
    }
  `]
})
export class ExecutionTraceComponent {
    @Input() steps: ExecutionStep[] = [];
}
