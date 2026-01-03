import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatComponent } from './components/chat/chat';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ChatComponent],
  template: `
    <div class="aura-app-container">
      <header style="background: #3f51b5; color: white; padding: 10px; text-align: center;">
        AURA System Active - Dev Mode
      </header>
      <main>
        <app-chat></app-chat>
      </main>
      
      <footer>
        <div class="footer-content">
          <p>© 2026 AURA Intelligent Assistant | Privacy First | Google Hackathon</p>
          <div class="status-indicator">
            <div class="status-dot"></div>
            <span>System Online: Gemini 1.5 Flash</span>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .aura-app-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: radial-gradient(circle at center, #1a1a2e 0%, #121212 100%);
      padding: 20px;
      box-sizing: border-box;
      border: 2px solid #333; /* Dark border instead of red for aesthetics but visible */
    }

    main {
      flex: 1;
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      overflow: hidden;
    }

    footer {
      padding: 12px 0;
      color: rgba(255,255,255,0.3);
      font-size: 0.75rem;
    }

    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4caf50;
      box-shadow: 0 0 8px #4caf50;
    }

    @media (max-width: 768px) {
      .aura-app-container {
        padding: 0;
      }
      main {
        border-radius: 0;
      }
      .footer-content {
        flex-direction: column;
        gap: 8px;
        text-align: center;
      }
    }
  `]
})
export class App { }
