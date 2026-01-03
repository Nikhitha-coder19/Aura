import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RiskLevel, Action } from '../../models/aura.models';

@Component({
    selector: 'app-confirmation-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
    template: `
    <div class="dialog-container glass-panel">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon [class]="riskClass">priority_high</mat-icon>
        Action Confirmation Required
      </h2>
      <mat-dialog-content>
        <div class="risk-badge" [class]="riskClass">
          Risk Level: {{ data.riskLevel }}
        </div>
        <p class="description">{{ data.message }}</p>
        
        @if (data.action) {
          <div class="action-details">
            <strong>Intended Action:</strong>
            <div class="action-summary">
              <mat-icon>launch</mat-icon>
              {{ data.action.description || data.action.type }}
            </div>
          </div>
        }

        <div class="safety-notice">
          <mat-icon>security</mat-icon>
          <span>AURA will only proceed once you confirm. No actions are taken automatically.</span>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">CANCEL</button>
        <button mat-raised-button color="primary" (click)="onConfirm()">CONFIRM & PROCEED</button>
      </mat-dialog-actions>
    </div>
  `,
    styles: [`
    .dialog-container {
      padding: 24px;
      color: white;
      min-width: 400px;
    }
    .dialog-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.5rem;
      margin-bottom: 20px;
    }
    .risk-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 0.75rem;
      font-weight: bold;
      margin-bottom: 16px;
      text-transform: uppercase;
    }
    .risk-medium { background: rgba(255, 152, 0, 0.2); color: #ff9800; border: 1px solid #ff9800; }
    .risk-high { background: rgba(244, 67, 54, 0.2); color: #f44336; border: 1px solid #f44336; }
    
    .description {
      font-size: 1.1rem;
      line-height: 1.5;
      margin-bottom: 20px;
    }
    .action-details {
      background: rgba(255,255,255,0.05);
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .action-summary {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      color: #2196f3;
    }
    .safety-notice {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 0.85rem;
      color: rgba(255,255,255,0.5);
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    .safety-notice mat-icon { font-size: 16px; width: 16px; height: 16px; margin-top: 2px; }
  `]
})
export class ConfirmationDialogComponent {
    get riskClass() {
        return this.data.riskLevel === RiskLevel.HIGH ? 'risk-high' : 'risk-medium';
    }

    constructor(
        public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: {
            message: string;
            riskLevel: RiskLevel;
            action?: Action
        }
    ) { }

    onConfirm(): void {
        this.dialogRef.close(true);
    }

    onCancel(): void {
        this.dialogRef.close(false);
    }
}
