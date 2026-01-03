import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuraRequest, AuraResponse, ChatMessage } from '../models/aura.models';

@Injectable({
    providedIn: 'root'
})
export class AuraService {
    // Replace with your Firebase Functions URL after deployment
    private apiUrl = '/api';

    private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
    public messages$ = this.messagesSubject.asObservable();

    private isProcessingSubject = new BehaviorSubject<boolean>(false);
    public isProcessing$ = this.isProcessingSubject.asObservable();

    constructor(private http: HttpClient) {
        // Initial welcome message
        this.addAuraMessage('Hello! I am AURA, your intelligent assistant. How can I help you today?');
    }

    processCommand(message: string, imageBase64?: string, confirmed: boolean = false): Observable<AuraResponse> {
        this.isProcessingSubject.next(true);

        const request: AuraRequest = {
            message,
            imageBase64,
            confirmed,
            userId: 'default-user' // In a real app, this would be the actual user ID
        };

        return this.http.post<AuraResponse>(`${this.apiUrl}/process`, request).pipe(
            tap(response => {
                this.handleAuraResponse(response, message);
                this.isProcessingSubject.next(false);
            }),
            catchError(error => {
                console.error('API Error:', error);
                this.addAuraMessage('I encountered an error connecting to my brain. Please check your connection or try again later.', 'error');
                this.isProcessingSubject.next(false);
                throw error;
            })
        );
    }

    private handleAuraResponse(response: AuraResponse, originalMessage: string): void {
        if (response.success) {
            const auraMessage: ChatMessage = {
                id: Date.now().toString(),
                text: response.message,
                sender: 'aura',
                timestamp: new Date(),
                executionTrace: response.executionTrace,
                action: response.action,
                riskLevel: response.riskLevel,
                requiresConfirmation: response.requiresConfirmation
            };

            this.messagesSubject.next([...this.messagesSubject.value, auraMessage]);
        } else {
            this.addAuraMessage(response.message || 'I couldn\'t process that request.', 'error', response.executionTrace);
        }
    }

    addUserMessage(text: string, image?: string): void {
        const message: ChatMessage = {
            id: Date.now().toString(),
            text,
            sender: 'user',
            timestamp: new Date(),
            image
        };
        this.messagesSubject.next([...this.messagesSubject.value, message]);
    }

    addAuraMessage(text: string, status: 'sent' | 'error' = 'sent', trace?: any[]): void {
        const message: ChatMessage = {
            id: Date.now().toString(),
            text,
            sender: 'aura',
            timestamp: new Date(),
            status,
            executionTrace: trace
        };
        this.messagesSubject.next([...this.messagesSubject.value, message]);
    }

    clearMessages(): void {
        this.messagesSubject.next([]);
        this.addAuraMessage('Memory cleared. How else can I help?');
    }
    executeAction(action: any): void {
        if (!action || !action.url) return;

        console.log('🟢 User-confirmed action:', action.url);
        window.open(action.url, '_blank', 'noopener,noreferrer');
    }

}
