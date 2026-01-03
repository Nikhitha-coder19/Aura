import { Component, ElementRef, ViewChild, AfterViewChecked, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuraService } from '../../services/aura.service';
import { VoiceService } from '../../services/voice.service';
import { ChatMessage, RiskLevel, ActionType } from '../../models/aura.models';
import { ExecutionTraceComponent } from '../execution-trace/execution-trace';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTooltipModule,
    MatDialogModule,
    ExecutionTraceComponent
  ],
  template: `
    <div class="chat-wrapper glass-panel">
      <div class="chat-header">
        <div class="aura-brand">
          <div class="aura-orb"></div>
          <h1>AURA</h1>
        </div>
        <div class="header-actions">
          <button mat-icon-button (click)="clearMemory()" matTooltip="Clear Memory">
            <mat-icon>delete_sweep</mat-icon>
          </button>
        </div>
      </div>

      <div class="message-container" #scrollContainer>
        @for (msg of (auraService.messages$ | async); track msg.id) {
          <div class="message-row" [class]="msg.sender">
            <div class="message-bubble" [class]="msg.sender">
              @if (msg.image) {
                <div class="message-image">
                  <img [src]="msg.image" alt="Uploaded image" />
                </div>
              }
              <div class="message-text">{{ msg.text }}</div>
              
              @if (msg.executionTrace && msg.executionTrace.length > 0) {
                <app-execution-trace [steps]="msg.executionTrace"></app-execution-trace>
              }

              @if (msg.requiresConfirmation && msg.sender === 'aura') {
                <div class="action-bar">
                  <button mat-raised-button color="primary" (click)="confirmAction(msg)">
                    CONFIRM & EXECUTE
                  </button>
                </div>
              }

              @if (!msg.requiresConfirmation && msg.action && msg.action.type === 'OPEN_URL') {
                <div class="action-bar">
                  <button mat-stroked-button color="accent" (click)="performAction(msg.action)">
                    RE-OPEN LINK
                  </button>
                </div>
              }

              <div class="message-time">
                {{ msg.timestamp | date:'shortTime' }}
              </div>
            </div>
          </div>
        }
        @if (auraService.isProcessing$ | async) {
          <div class="message-row aura">
            <div class="message-bubble aura typing">
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
            </div>
          </div>
        }
      </div>

      <div class="input-area">
        <div class="input-container glass-panel">
          <button mat-icon-button (click)="triggerImageUpload()" matTooltip="Analyze Image">
            <mat-icon [color]="imageBase64 ? 'accent' : ''">image</mat-icon>
            <input #fileInput type="file" (change)="onFileSelected($event)" accept="image/*" style="display:none" />
          </button>
          
          <input 
            type="text" 
            [(ngModel)]="userInput" 
            (keyup.enter)="sendMessage()" 
            placeholder="Ask AURA anything..." 
            [disabled]="(auraService.isProcessing$ | async) ?? false"
          />

          @if (voiceSupported) {
            <button mat-icon-button (click)="toggleVoice()" [color]="isListening ? 'warn' : ''" [matTooltip]="isListening ? 'Stop' : 'Voice Command'">
              <mat-icon>{{ isListening ? 'mic' : 'mic_none' }}</mat-icon>
            </button>
          }

          <button mat-icon-button color="primary" (click)="sendMessage()" [disabled]="!userInput.trim() && !imageBase64" matTooltip="Send">
            <mat-icon>send</mat-icon>
          </button>
        </div>
        @if (imageBase64) {
          <div class="upload-preview">
            <img [src]="imageBase64" />
            <button mat-icon-button class="remove-upload" (click)="removeImage()">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .chat-wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      border-radius: 20px;
    }
    .chat-header {
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .aura-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .aura-orb {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      box-shadow: 0 0 15px #6366f1;
      animation: glow 3s infinite alternate;
    }
    @keyframes glow {
      from { box-shadow: 0 0 5px #6366f1; }
      to { box-shadow: 0 0 20px #a855f7; }
    }
    h1 {
      margin: 0;
      font-size: 1.5rem;
      letter-spacing: 4px;
      background: linear-gradient(135deg, #fff, #a5a5a5);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .message-container {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .message-row {
      display: flex;
      width: 100%;
    }
    .message-row.user { justify-content: flex-end; }
    .message-row.aura { justify-content: flex-start; }

    .message-bubble {
      max-width: 80%;
      padding: 16px;
      border-radius: 20px;
      position: relative;
      font-size: 1rem;
      line-height: 1.5;
    }
    .message-bubble.user {
      background: rgba(99, 102, 241, 0.2);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-bottom-right-radius: 4px;
    }
    .message-bubble.aura {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-bottom-left-radius: 4px;
      width: 100%;
    }

    .message-image img {
      max-width: 100%;
      max-height: 300px;
      border-radius: 12px;
      margin-bottom: 12px;
    }

    .message-time {
      font-size: 0.75rem;
      color: rgba(255,255,255,0.4);
      margin-top: 8px;
      text-align: right;
    }

    .action-bar {
      margin-top: 16px;
      display: flex;
      gap: 12px;
    }

    .typing {
      display: flex;
      gap: 4px;
      width: 60px;
      padding: 12px 16px;
    }
    .typing-dot {
      width: 6px;
      height: 6px;
      background: rgba(255,255,255,0.4);
      border-radius: 50%;
      animation: typing 1s infinite alternate;
    }
    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing {
      from { transform: translateY(0); }
      to { transform: translateY(-4px); }
    }

    .input-area {
      padding: 24px;
      background: rgba(0,0,0,0.2);
      border-top: 1px solid rgba(255,255,255,0.05);
      position: relative;
    }
    .input-container {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      gap: 8px;
    }
    .input-container input {
      flex: 1;
      background: transparent;
      border: none;
      color: white;
      font-size: 1rem;
      padding: 8px;
    }
    .input-container input:focus { outline: none; }

    .upload-preview {
      position: absolute;
      top: -100px;
      left: 24px;
      width: 80px;
      height: 80px;
      border-radius: 8px;
      overflow: hidden;
      border: 2px solid #6366f1;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
    .upload-preview img { width: 100%; height: 100%; object-fit: cover; }
    .remove-upload {
      position: absolute;
      top: -10px;
      right: -10px;
      background: #f44336;
      width: 20px;
      height: 20px;
      padding: 0;
      min-width: 0;
    }
    .remove-upload mat-icon { font-size: 14px; width: 14px; height: 14px; color: white; }
  `]
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild('fileInput') private fileInput!: ElementRef;

  userInput: string = '';
  imageBase64: string | null = null;
  isListening: boolean = false;
  voiceSupported: boolean = false;

  constructor(
    public auraService: AuraService,
    private voiceService: VoiceService,
    private dialog: MatDialog
  ) {
    console.log('💬 ChatComponent: Initialized');
  }

  ngOnInit() {
    this.voiceSupported = this.voiceService.getSupported();
    this.voiceService.getTranscript().subscribe(transcript => {
      this.userInput = transcript;
      this.sendMessage();
      this.isListening = false;
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) { }
  }

  sendMessage() {
    if (!this.userInput.trim() && !this.imageBase64) return;

    const message = this.userInput.trim();
    const image = this.imageBase64 || undefined;

    this.auraService.addUserMessage(message, image || undefined);
    this.auraService.processCommand(message, image || undefined).subscribe();

    this.userInput = '';
    this.imageBase64 = null;
  }

  toggleVoice() {
    console.log('🎙️ ChatComponent: Toggling voice...', this.isListening ? 'Stopping' : 'Starting');
    if (this.isListening) {
      this.voiceService.stop();
      this.isListening = false;
    } else {
      this.voiceService.start();
      this.isListening = true;
    }
  }

  triggerImageUpload() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imageBase64 = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.imageBase64 = null;
  }

  // confirmAction(msg: ChatMessage) {
  //   const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
  //     data: {
  //       message: msg.text,
  //       riskLevel: msg.riskLevel,
  //       action: msg.action
  //     },
  //     panelClass: 'glass-dialog'
  //   });

  //   dialogRef.afterClosed().subscribe(confirmed => {
  //     if (confirmed) {
  //       this.auraService.processCommand(msg.text, undefined, true).subscribe();
  //     }
  //   });
  // }
  confirmAction(msg: ChatMessage) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        message: msg.text,
        riskLevel: msg.riskLevel,
        action: msg.action
      },
      panelClass: 'glass-dialog'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed && msg.action) {
        this.auraService.executeAction(msg.action);
      }
    });
  }

  performAction(action: any) {
    if (action.url) {
      window.open(action.url, '_blank');
    }
  }

  clearMemory() {
    if (confirm('Are you sure you want to clear your conversation history and preferences?')) {
      this.auraService.clearMessages();
    }
  }

}
