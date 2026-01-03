/**
 * AURA - Intent Classification Service
 * Maps classified intents to actionable categories
 */

import { Intent, ClassificationResult } from '../types';
import { GeminiService } from './gemini.service';

// Platform URL mappings
export const WEB_APPS: Record<string, string> = {
    'whatsapp': 'https://web.whatsapp.com',
    'gmail': 'https://mail.google.com',
    'email': 'https://mail.google.com',
    'youtube': 'https://www.youtube.com',
    'spotify': 'https://open.spotify.com',
    'google': 'https://www.google.com',
    'drive': 'https://drive.google.com',
    'calendar': 'https://calendar.google.com',
    'maps': 'https://maps.google.com',
    'twitter': 'https://twitter.com',
    'x': 'https://twitter.com',
    'linkedin': 'https://www.linkedin.com',
    'facebook': 'https://www.facebook.com',
    'instagram': 'https://www.instagram.com',
};

// Keywords that suggest specific intents
const INTENT_KEYWORDS: Record<Intent, string[]> = {
    [Intent.OPEN_WEB_APP]: ['open', 'launch', 'start', 'go to', 'navigate', 'show me'],
    [Intent.SEND_MESSAGE]: ['send', 'message', 'text', 'tell', 'whatsapp'],
    [Intent.DRAFT_EMAIL]: ['email', 'mail', 'compose', 'draft', 'write to'],
    [Intent.SUMMARIZE]: ['summarize', 'summary', 'brief', 'tldr', 'shorten'],
    [Intent.PLAY_MEDIA]: ['play', 'listen', 'watch', 'music', 'song', 'video'],
    [Intent.SEARCH]: ['search', 'find', 'look up', 'google'],
    [Intent.ASK_QUESTION]: ['what', 'who', 'where', 'when', 'why', 'how', 'can you', 'tell me'],
    [Intent.VISION_ANALYZE]: ['look at', 'see this', 'analyze', 'image', 'picture', 'photo', 'what is this'],
    [Intent.GREETING]: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'how are you', 'sup'],
    [Intent.UNKNOWN]: []
};

export class IntentService {
    private geminiService: GeminiService;

    constructor(geminiService: GeminiService) {
        this.geminiService = geminiService;
    }

    /**
     * Classify intent using Gemini AI
     */
    async classifyIntent(message: string): Promise<ClassificationResult> {
        // Use Gemini for intelligent classification
        const result = await this.geminiService.classifyIntent(message);

        // Fallback to keyword matching if confidence is low
        if (result.confidence < 0.5) {
            const keywordResult = this.classifyByKeywords(message);
            if (keywordResult.confidence > result.confidence) {
                return keywordResult;
            }
        }

        // Post-processing: Clean entities of action keywords
        if (result.entities) {
            const keywordsToStrip = ['saying', 'message', 'text', 'that', 'about', 'subject', 'body', 'search', 'find', 'for'];
            if (result.entities.content) {
                for (const kw of keywordsToStrip) {
                    const regex = new RegExp(`^${kw}\\s+`, 'i');
                    result.entities.content = result.entities.content.replace(regex, '').trim();
                }
            }
            if (result.entities.query) {
                for (const kw of keywordsToStrip) {
                    const regex = new RegExp(`^${kw}\\s+`, 'i');
                    result.entities.query = result.entities.query.replace(regex, '').trim();
                }
            }
        }

        return result;
    }

    /**
     * Fallback keyword-based classification
     */
    private classifyByKeywords(message: string): ClassificationResult {
        const lowerMessage = message.toLowerCase();
        const entities: Record<string, string> = {};

        // Detect platform
        for (const [platform] of Object.entries(WEB_APPS)) {
            if (lowerMessage.includes(platform)) {
                entities.platform = platform;
                break;
            }
        }

        // Score each intent
        let bestIntent = Intent.UNKNOWN;
        let bestScore = 0;

        for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
            const score = keywords.filter(kw => lowerMessage.includes(kw)).length;
            if (score > bestScore) {
                bestScore = score;
                bestIntent = intent as Intent;
            }
        }

        // Fallback Logic: If no platform detected but it's a message, assume WhatsApp
        if (!entities.platform && (bestIntent === Intent.SEND_MESSAGE || lowerMessage.includes('message'))) {
            entities.platform = 'whatsapp';
            bestIntent = Intent.SEND_MESSAGE;
            bestScore = Math.max(bestScore, 1);
        }

        // Fallback Logic: Aggressively extract phone number or email from message
        if (bestIntent === Intent.SEND_MESSAGE || bestIntent === Intent.DRAFT_EMAIL || lowerMessage.includes('message') || lowerMessage.includes('whatsapp') || lowerMessage.includes('email') || lowerMessage.includes('mail')) {
            // Match Email
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const emailMatches = lowerMessage.match(emailRegex);
            if (emailMatches) {
                entities.recipient = emailMatches[0];
                console.log(`🔍 Fallback: Found email: ${entities.recipient}`);
            }

            // Match Phone (only if email not found or if whatsapp mentioned)
            if (!entities.recipient || lowerMessage.includes('whatsapp')) {
                const phoneRegex = /(?:\+?\d{1,3}[\s-]?)?\(?\d{2,5}\)?[\s-]?\d{3,5}[\s-]?\d{3,5}/g;
                const phoneMatches = lowerMessage.match(phoneRegex);

                if (phoneMatches) {
                    const cleanMatches = phoneMatches.map(m => m.replace(/[\s\-\(\)\+]/g, '')).filter(m => m.length >= 10);
                    if (cleanMatches.length > 0) {
                        entities.recipient = cleanMatches[0];
                        console.log(`🔍 Fallback: Found phone number: ${entities.recipient}`);
                    }
                }
            }

            // Extract everything after keywords as content, but avoid the recipient if possible
            const contentRegex = /(?:saying|message|text|that|about|subject|body)\s+(.+)$/i;
            const contextMatch = message.match(contentRegex);
            if (contextMatch) {
                let content = contextMatch[1].trim();
                // If the extracted content starts with the number, strip it
                if (entities.recipient && content.startsWith(entities.recipient)) {
                    content = content.replace(entities.recipient, '').replace(/^[:\s\-]+/, '').trim();
                }
                entities.content = content;
                console.log(`🔍 Fallback: Found cleaned content: ${entities.content}`);
            }
        }

        // If a platform is mentioned with action words, it's likely OPEN_WEB_APP
        if (entities.platform && bestIntent === Intent.UNKNOWN) {
            bestIntent = Intent.OPEN_WEB_APP;
            bestScore = 1;
        }

        return {
            intent: bestIntent,
            confidence: Math.min(bestScore * 0.3, 0.9),
            entities
        };
    }

    /**
     * Get the appropriate URL for a platform
     */
    getPlatformUrl(platform: string): string | null {
        const normalized = platform.toLowerCase().trim();
        return WEB_APPS[normalized] || null;
    }

    /**
     * Build a search URL
     */
    buildSearchUrl(query: string, platform: string = 'google'): string {
        const encodedQuery = encodeURIComponent(query);

        switch (platform.toLowerCase()) {
            case 'youtube':
                return `https://www.youtube.com/results?search_query=${encodedQuery}`;
            case 'spotify':
                return `https://open.spotify.com/search/${encodedQuery}`;
            case 'google':
            default:
                return `https://www.google.com/search?q=${encodedQuery}`;
        }
    }

    /**
     * Build Gmail compose URL with prefilled content
     */
    buildGmailComposeUrl(to?: string, subject?: string, body?: string): string {
        const toParam = to ? `&to=${encodeURIComponent(to)}` : '';
        const suParam = subject ? `&su=${encodeURIComponent(subject)}` : '';
        const bodyParam = body ? `&body=${encodeURIComponent(body)}` : '';

        // Using a more comprehensive Gmail compose URL format
        return `https://mail.google.com/mail/?view=cm&fs=1&tf=1&source=mailto${toParam}${suParam}${bodyParam}`;
    }
}
