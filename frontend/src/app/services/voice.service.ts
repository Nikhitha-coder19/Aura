import { Injectable, NgZone } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class VoiceService {
    private recognition: any;
    private isListening = false;
    private transcriptSubject = new Subject<string>();

    constructor(private zone: NgZone) {
        this.initRecognition();
    }

    private initRecognition(): void {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('Speech Recognition not supported in this browser.');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            this.zone.run(() => {
                this.transcriptSubject.next(transcript);
            });
        };

        this.recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            this.stop();
        };

        this.recognition.onend = () => {
            this.isListening = false;
        };
    }

    start(): void {
        console.log('🎤 VoiceService: Attempting to start recognition...');
        if (this.recognition && !this.isListening) {
            try {
                this.recognition.start();
                this.isListening = true;
                console.log('🎤 VoiceService: Recognition started');
            } catch (e) {
                console.error('🎤 VoiceService: Failed to start recognition:', e);
            }
        } else {
            console.warn('🎤 VoiceService: Cannot start. Recognition:', !!this.recognition, 'isListening:', this.isListening);
        }
    }

    stop(): void {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    }

    getTranscript(): Observable<string> {
        return this.transcriptSubject.asObservable();
    }

    getSupported(): boolean {
        return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    }
}
