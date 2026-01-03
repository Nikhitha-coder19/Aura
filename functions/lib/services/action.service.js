"use strict";
/**
 * AURA - Action Planning Service
 * Plans and generates actions based on classified intent
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionService = void 0;
const types_1 = require("../types");
class ActionService {
    intentService;
    geminiService;
    constructor(intentService, geminiService) {
        this.intentService = intentService;
        this.geminiService = geminiService;
    }
    /**
     * Plan action based on intent classification
     */
    async planAction(classification, originalMessage, startStep = 4) {
        let stepNum = startStep;
        switch (classification.intent) {
            case types_1.Intent.OPEN_WEB_APP:
                return this.planOpenWebApp(classification, stepNum);
            case types_1.Intent.SEND_MESSAGE:
                return this.planSendMessage(classification, originalMessage, stepNum);
            case types_1.Intent.DRAFT_EMAIL:
                return this.planDraftEmail(classification, originalMessage, stepNum);
            case types_1.Intent.PLAY_MEDIA:
                return this.planPlayMedia(classification, originalMessage, stepNum);
            case types_1.Intent.SEARCH:
                return this.planSearch(classification, originalMessage, stepNum);
            case types_1.Intent.ASK_QUESTION:
                return await this.planAskQuestion(originalMessage, stepNum);
            case types_1.Intent.SUMMARIZE:
                return await this.planSummarize(originalMessage, stepNum);
            case types_1.Intent.VISION_ANALYZE:
                return this.planVisionAnalyze(stepNum);
            case types_1.Intent.GREETING:
                return await this.planGreeting(originalMessage, stepNum);
            default:
                return this.planUnknown(originalMessage, stepNum);
        }
    }
    /**
     * Plan opening a web application
     */
    planOpenWebApp(classification, stepNum) {
        const platform = classification.entities.platform || 'google';
        const url = this.intentService.getPlatformUrl(platform) || 'https://www.google.com';
        return {
            action: {
                type: types_1.ActionType.OPEN_URL,
                url,
                platform,
                description: `Open ${platform}`
            },
            steps: [
                {
                    step: stepNum,
                    label: 'Action planned',
                    value: `Open ${platform}`,
                    status: 'completed'
                }
            ],
            message: `Opening ${platform} for you.`
        };
    }
    /**
     * Plan sending a message (opens WhatsApp Web)
     */
    planSendMessage(classification, originalMessage, stepNum) {
        const platform = classification.entities.platform || 'whatsapp';
        const recipient = classification.entities.recipient;
        const content = classification.entities.content || '';
        // For WhatsApp, we use the wa.me format for deep linking messages
        let url = 'https://web.whatsapp.com';
        const cleanContent = content || '';
        if (recipient) {
            let phoneMatch = recipient.replace(/[^0-9]/g, '');
            // Smart helper: assume India (+91) if 10 digits
            if (phoneMatch.length === 10) {
                phoneMatch = '91' + phoneMatch;
            }
            if (phoneMatch.length >= 10) {
                const encodedText = encodeURIComponent(cleanContent);
                // Directly link to web.whatsapp.com/send for a better desktop experience
                url = `https://web.whatsapp.com/send?phone=${phoneMatch}&text=${encodedText}`;
                console.log(`📡 AURA WhatsApp Direct: ${url}`);
            }
            else {
                url = 'https://web.whatsapp.com/';
            }
        }
        else if (cleanContent) {
            url = `https://web.whatsapp.com/send?text=${encodeURIComponent(cleanContent)}`;
        }
        const steps = [
            {
                step: stepNum,
                label: 'Action planned',
                value: 'Open WhatsApp Web',
                status: 'completed'
            }
        ];
        if (content) {
            steps.push({
                step: stepNum + 1,
                label: 'Draft message',
                value: content,
                status: 'completed'
            });
        }
        return {
            action: {
                type: types_1.ActionType.OPEN_URL,
                url,
                platform,
                content,
                description: recipient ? `Message ${recipient}` : 'Open WhatsApp'
            },
            steps,
            message: recipient
                ? `Ready to message ${recipient}.`
                : 'Ready to open WhatsApp Web.'
        };
    }
    /**
     * Plan drafting an email (opens Gmail compose)
     */
    async planDraftEmail(classification, originalMessage, stepNum) {
        const recipient = classification.entities.recipient || '';
        const content = classification.entities.content || '';
        // Generate draft if context provided
        let draftContent = content;
        let subject = '';
        if (content && !content.includes('Subject:')) {
            const draft = await this.geminiService.generateDraft('email', recipient, content);
            const lines = draft.split('\n');
            if (lines[0].toLowerCase().startsWith('subject:')) {
                subject = lines[0].replace(/^subject:\s*/i, '');
                draftContent = lines.slice(1).join('\n').trim();
            }
            else {
                draftContent = draft;
            }
        }
        const url = this.intentService.buildGmailComposeUrl(recipient, subject, draftContent);
        const steps = [
            {
                step: stepNum,
                label: 'Action planned',
                value: 'Open Gmail Compose',
                status: 'completed'
            }
        ];
        if (recipient) {
            steps.push({
                step: stepNum + 1,
                label: 'Recipient',
                value: recipient,
                status: 'completed'
            });
        }
        if (draftContent) {
            steps.push({
                step: stepNum + (recipient ? 2 : 1),
                label: 'Draft content',
                value: draftContent.substring(0, 100) + (draftContent.length > 100 ? '...' : ''),
                status: 'completed'
            });
        }
        return {
            action: {
                type: types_1.ActionType.OPEN_URL,
                url,
                platform: 'gmail',
                content: draftContent,
                description: recipient ? `Email to ${recipient}` : 'Compose email'
            },
            steps,
            message: `Opening Gmail compose${recipient ? ` for ${recipient}` : ''}. Please review the draft before sending.`
        };
    }
    /**
     * Plan playing media (YouTube/Spotify search)
     */
    planPlayMedia(classification, originalMessage, stepNum) {
        const platform = classification.entities.platform || 'youtube';
        const query = classification.entities.query || classification.entities.media ||
            originalMessage.replace(/play|listen to|watch/gi, '').trim();
        const url = this.intentService.buildSearchUrl(query, platform);
        return {
            action: {
                type: types_1.ActionType.OPEN_URL,
                url,
                platform,
                description: `Search "${query}" on ${platform}`
            },
            steps: [
                {
                    step: stepNum,
                    label: 'Action planned',
                    value: `Search ${platform}`,
                    status: 'completed'
                },
                {
                    step: stepNum + 1,
                    label: 'Search query',
                    value: query,
                    status: 'completed'
                }
            ],
            message: `Searching for "${query}" on ${platform}.`
        };
    }
    /**
     * Plan a search
     */
    planSearch(classification, originalMessage, stepNum) {
        const query = classification.entities.query ||
            originalMessage.replace(/search|look up|find|google/gi, '').trim();
        const url = this.intentService.buildSearchUrl(query);
        return {
            action: {
                type: types_1.ActionType.OPEN_URL,
                url,
                platform: 'google',
                description: `Search for "${query}"`
            },
            steps: [
                {
                    step: stepNum,
                    label: 'Action planned',
                    value: 'Google Search',
                    status: 'completed'
                },
                {
                    step: stepNum + 1,
                    label: 'Search query',
                    value: query,
                    status: 'completed'
                }
            ],
            message: `Searching for "${query}" on Google.`
        };
    }
    /**
     * Plan answering a question (uses Gemini)
     */
    async planAskQuestion(originalMessage, stepNum) {
        const response = await this.geminiService.generateResponse(originalMessage);
        return {
            action: {
                type: types_1.ActionType.DISPLAY,
                content: response,
                description: 'Answer question'
            },
            steps: [
                {
                    step: stepNum,
                    label: 'Action planned',
                    value: 'Generate response',
                    status: 'completed'
                },
                {
                    step: stepNum + 1,
                    label: 'Response generated',
                    value: 'See below',
                    status: 'completed'
                }
            ],
            message: response
        };
    }
    /**
     * Plan summarization
     */
    async planSummarize(originalMessage, stepNum) {
        // Extract content to summarize
        const contentMatch = originalMessage.match(/summarize[:\s]+(.+)/i);
        const content = contentMatch ? contentMatch[1] : originalMessage;
        const summary = await this.geminiService.summarize(content);
        return {
            action: {
                type: types_1.ActionType.DISPLAY,
                content: summary,
                description: 'Summarize content'
            },
            steps: [
                {
                    step: stepNum,
                    label: 'Action planned',
                    value: 'Summarize content',
                    status: 'completed'
                },
                {
                    step: stepNum + 1,
                    label: 'Summary generated',
                    value: 'See below',
                    status: 'completed'
                }
            ],
            message: summary
        };
    }
    /**
     * Plan vision analysis (placeholder - actual analysis happens separately)
     */
    planVisionAnalyze(stepNum) {
        return {
            action: {
                type: types_1.ActionType.DISPLAY,
                description: 'Analyze image'
            },
            steps: [
                {
                    step: stepNum,
                    label: 'Action planned',
                    value: 'Analyze uploaded image',
                    status: 'completed'
                }
            ],
            message: 'Analyzing the image...'
        };
    }
    /**
     * Plan a greeting response
     */
    async planGreeting(originalMessage, stepNum) {
        const response = await this.geminiService.generateResponse(originalMessage);
        return {
            action: {
                type: types_1.ActionType.DISPLAY,
                content: response,
                description: 'Greeting response'
            },
            steps: [
                {
                    step: stepNum,
                    label: 'Intent detected',
                    value: 'Greeting',
                    status: 'completed'
                }
            ],
            message: response
        };
    }
    /**
     * Handle unknown intent
     */
    planUnknown(originalMessage, stepNum) {
        return {
            action: {
                type: types_1.ActionType.DISPLAY,
                description: 'Unknown action'
            },
            steps: [
                {
                    step: stepNum,
                    label: 'Action planned',
                    value: 'Unable to determine action',
                    status: 'warning'
                }
            ],
            message: "I'm not sure how to help with that. Could you please rephrase your request? I can help with opening web apps, messaging, emails, playing media, searching, or answering questions."
        };
    }
}
exports.ActionService = ActionService;
//# sourceMappingURL=action.service.js.map