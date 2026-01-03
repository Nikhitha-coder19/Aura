"use strict";
/**
 * AURA - Gemini AI Service
 * Handles all interactions with Google Gemini 1.5 Flash
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
const generative_ai_1 = require("@google/generative-ai");
const types_1 = require("../types");
const GEMINI_MODEL = 'gemini-1.5-flash';
class GeminiService {
    genAI;
    model;
    constructor(apiKey) {
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: GEMINI_MODEL }, { apiVersion: 'v1' });
    }
    /**
     * Classify user intent from natural language
     */
    async classifyIntent(message) {
        const prompt = `You are an intent classifier for a web-based assistant called AURA.

Classify the following user message into ONE of these intents:
- OPEN_WEB_APP: User wants to open a web application (WhatsApp, Gmail, YouTube, Spotify, etc.)
- SEND_MESSAGE: User wants to send a message (on WhatsApp, SMS, etc.)
- DRAFT_EMAIL: User wants to compose/draft an email
- SUMMARIZE: User wants to summarize text, an article, or content
- PLAY_MEDIA: User wants to play music, video, or other media
- SEARCH: User wants to search for information online
- ASK_QUESTION: User is asking a general question
- VISION_ANALYZE: User wants to analyze an image (uses phrases like "look at this", "what's in this image")
- GREETING: User says hello, hi, how are you, or starts a conversation
- UNKNOWN: Cannot determine the intent

Also extract relevant entities like:
- platform: The web app or service mentioned (whatsapp, gmail, youtube, spotify, google)
- recipient: Person or contact mentioned
- content: The actual message content (STRICTLY EXCLUDE action keywords like 'saying', 'message', 'text', 'draft', 'write', 'about', 'that')
- query: The search query (STRICTLY EXCLUDE action keywords like 'search', 'find', 'google', 'for')
- media: Song, video, or media name

Respond in this exact JSON format only, no other text:
{
  "intent": "INTENT_NAME",
  "confidence": 0.95,
  "entities": {
    "platform": "...",
    "recipient": "...",
    "content": "...",
    "query": "..."
  }
}

User message: "${message}"`;
        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response.text();
            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    intent: parsed.intent || types_1.Intent.UNKNOWN,
                    confidence: parsed.confidence || 0.5,
                    entities: parsed.entities || {}
                };
            }
        }
        catch (error) {
            console.error('Intent classification error Details:', error);
            if (error.message)
                console.error('Error Message:', error.message);
            if (error.stack)
                console.error('Error Stack:', error.stack);
        }
        return {
            intent: types_1.Intent.UNKNOWN,
            confidence: 0,
            entities: {}
        };
    }
    /**
     * Generate a response for general questions
     */
    async generateResponse(message, context) {
        const prompt = `You are AURA, a helpful, friendly, and intelligent web-based assistant.

${context ? `Context from memory:\n${context}\n\n` : ''}

User: ${message}

Respond helpfully and concisely. Be conversational but efficient.`;
        try {
            const result = await this.model.generateContent(prompt);
            return result.response.text();
        }
        catch (error) {
            console.error('Response generation error:', error);
            // Manual fallback for greetings and simple talk if API is down
            const lowerMessage = message.toLowerCase();
            if (lowerMessage.includes('hi') || lowerMessage.includes('hello')) {
                return "Hello! I'm AURA. My AI brain is currently having a connectivity issue, but I'm still here to help you open apps or search for things!";
            }
            return "I apologize, but I encountered an error connecting to my AI model. I can still help you with basic commands like 'Open YouTube' or 'Search Google'!";
        }
    }
    /**
     * Analyze an image using Gemini Vision
     */
    async analyzeImage(imageBase64, message) {
        try {
            const imagePart = {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageBase64
                }
            };
            const textPart = {
                text: `You are AURA, a helpful assistant. The user has shared an image and said: "${message}"

Please analyze the image and provide helpful information or suggestions based on what you see. Be specific about what you observe and any actions you can help with.`
            };
            const result = await this.model.generateContent([textPart, imagePart]);
            return result.response.text();
        }
        catch (error) {
            console.error('Vision analysis error:', error);
            return "I couldn't analyze the image. Please make sure it's a valid image file and try again.";
        }
    }
    /**
     * Summarize text content
     */
    async summarize(content) {
        const prompt = `Please summarize the following content concisely while preserving the key information:

${content}

Provide a clear, well-structured summary.`;
        try {
            const result = await this.model.generateContent(prompt);
            return result.response.text();
        }
        catch (error) {
            console.error('Summarization error:', error);
            return "I couldn't generate a summary. Please try again.";
        }
    }
    /**
     * Generate draft content (message or email)
     */
    async generateDraft(type, recipient, context) {
        const prompt = type === 'email'
            ? `Draft a professional email to ${recipient}. Context: ${context}. 
         Format: Subject line first, then email body. Be concise and professional.`
            : `Draft a friendly message to ${recipient}. Context: ${context}. 
         Keep it natural and conversational.`;
        try {
            const result = await this.model.generateContent(prompt);
            return result.response.text();
        }
        catch (error) {
            console.error('Draft generation error:', error);
            return `Draft for ${recipient}: ${context}`;
        }
    }
}
exports.GeminiService = GeminiService;
//# sourceMappingURL=gemini.service.js.map