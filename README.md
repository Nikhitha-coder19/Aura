# AURA - Intelligent Executive Assistant 🌌

AURA is a web-based, voice + text controlled executive agent built with **Angular**, **Firebase**, and **Google Gemini 1.5 Flash**.

## ✨ Key Features

- **Transparent Reasoning**: AURA shows every execution step it takes.
- **Risk Assessment**: Categorizes actions into LOW, MEDIUM, and HIGH risk.
- **Safety First**: Never auto-executes risky actions without confirmation.
- **Voice Control**: Full control via browser microphone (Web Speech API).
- **Vision Support**: Analyze images by uploading them directly to Gemini.
- **Memory System**: Remembers your preferences and frequent actions.

## 🚀 Getting Started

### Prerequisites

- Node.js (v20+)
- Firebase CLI (`npm install -g firebase-tools`)
- Google AI Studio API Key (for Gemini)

### Backend Setup (Firebase Functions)

1. Navigate to the functions directory:
   ```bash
   cd functions
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in `functions/` or set use Firebase config:
   ```bash
   firebase functions:config:set gemini.apikey="YOUR_API_KEY"
   ```
4. Start the emulators:
   ```bash
   npm run serve
   ```

### Frontend Setup (Angular)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm start
   ```
   *Note: `npm start` uses `proxy.conf.json` to route `/api` to the Firebase emulator.*

## 🛠️ Tech Stack

- **Frontend**: Angular 18, Angular Material, SCSS
- **Backend**: Firebase Cloud Functions (TypeScript)
- **Database**: Firestore (Memory & Preferences)
- **AI**: Google Gemini 1.5 Flash (Text & Vision)
- **Speech**: Web Speech API

## 🔒 Security & Privacy

- **No OS Access**: AURA runs entirely within the browser sandbox.
- **No Passwords**: We never store or ask for credentials.
- **Full Transparency**: Execution trace shows exactly what's happening.
- **User Confirmation**: Critical actions require manual approval.

---
Built for Google Hackathon 2026.
