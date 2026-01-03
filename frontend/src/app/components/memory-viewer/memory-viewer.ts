import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { AuraService } from '../../services/aura.service';

@Component({
    selector: 'app-memory-viewer',
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule, MatDividerModule, MatChipsModule],
    template: `
    <div class="memory-container glass-panel">
      <div class="memory-header">
        <mat-icon>psychology</mat-icon>
        <h2>AURA LONG-TERM MEMORY</h2>
        <span class="read-only-badge">VERIFIED READ-ONLY</span>
      </div>

      <div class="memory-section">
        <h3><mat-icon>star</mat-icon> User Preferences</h3>
        <div class="pref-grid">
          @if (preferences.length > 0) {
            @for (pref of preferences; track pref.key) {
              <div class="pref-item">
                <span class="pref-key">{{ pref.key }}</span>
                <span class="pref-value">{{ pref.value }}</span>
              </div>
            }
          } @else {
            <p class="empty-state">No preferences saved yet.</p>
          }
        </div>
      </div>

      <mat-divider></mat-divider>

      <div class="memory-section">
        <h3><mat-icon>history</mat-icon> Frequent Actions</h3>
        <div class="chip-list">
          @for (action of frequentActions; track action.intent) {
            <mat-chip-set>
              <mat-chip [color]="action.count > 5 ? 'primary' : ''" selected>
                {{ action.intent }} {{ action.platform ? '(' + action.platform + ')' : '' }}: {{ action.count }}
              </mat-chip>
            </mat-chip-set>
          } @empty {
            <p class="empty-state">No action history recorded.</p>
          }
        </div>
      </div>

      <div class="privacy-notice">
        <mat-icon>security</mat-icon>
        <p>Memory is stored securely in your private Firestore instance. Sensitive data like passwords are never stored.</p>
      </div>
    </div>
  `,
    styles: [`
    .memory-container {
      padding: 24px;
      height: 100%;
      overflow-y: auto;
    }
    .memory-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    .memory-header h2 { margin: 0; font-size: 1.2rem; letter-spacing: 2px; }
    .read-only-badge {
      font-size: 0.6rem;
      padding: 2px 8px;
      background: rgba(76, 175, 80, 0.2);
      color: #4caf50;
      border: 1px solid #4caf50;
      border-radius: 4px;
      margin-left: auto;
    }

    .memory-section {
      margin: 20px 0;
    }
    .memory-section h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
      color: rgba(255,255,255,0.7);
      margin-bottom: 16px;
    }
    .memory-section h3 mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .pref-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }
    .pref-item {
      background: rgba(255,255,255,0.03);
      padding: 8px 12px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
    }
    .pref-key { font-size: 0.7rem; color: rgba(255,255,255,0.4); text-transform: uppercase; }
    .pref-value { font-size: 1rem; color: #fff; }

    .chip-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .empty-state {
      color: rgba(255,255,255,0.3);
      font-style: italic;
      font-size: 0.9rem;
    }

    .privacy-notice {
      margin-top: 40px;
      padding: 16px;
      background: rgba(33, 150, 243, 0.05);
      border-radius: 8px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      color: rgba(255,255,255,0.5);
      font-size: 0.8rem;
    }
    .privacy-notice mat-icon { color: #2196f3; font-size: 20px; width: 20px; height: 20px; }
  `]
})
export class MemoryViewerComponent implements OnInit {
    preferences: { key: string, value: string }[] = [];
    frequentActions: any[] = [];

    constructor(private auraService: AuraService) { }

    ngOnInit() {
        // In a real app, this would fetch from the backend via AuraService
        // For this prototype, we'll show current session-based or mock data
        this.preferences = [
            { key: 'MEMBER_SINCE', value: 'JAN 2026' },
            { key: 'FAVORITE_PLATFORM', value: 'WHATSAPP' },
            { key: 'VOICE_ENABLED', value: 'TRUE' }
        ];

        this.frequentActions = [
            { intent: 'OPEN_WEB_APP', platform: 'WHATSAPP', count: 12 },
            { intent: 'SEARCH', platform: 'GOOGLE', count: 8 },
            { intent: 'DRAFT_EMAIL', platform: 'GMAIL', count: 5 }
        ];
    }
}
