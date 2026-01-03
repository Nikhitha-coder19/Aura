/**
 * AURA - Risk Assessment Service
 * Evaluates the risk level of each action
 */

import { Intent, RiskLevel, ClassificationResult } from '../types';

// Default risk levels per intent
const INTENT_RISK_MAP: Record<Intent, RiskLevel> = {
    [Intent.OPEN_WEB_APP]: RiskLevel.LOW,
    [Intent.SEARCH]: RiskLevel.LOW,
    [Intent.ASK_QUESTION]: RiskLevel.LOW,
    [Intent.PLAY_MEDIA]: RiskLevel.LOW,
    [Intent.SUMMARIZE]: RiskLevel.LOW,
    [Intent.SEND_MESSAGE]: RiskLevel.MEDIUM,
    [Intent.DRAFT_EMAIL]: RiskLevel.MEDIUM,
    [Intent.VISION_ANALYZE]: RiskLevel.LOW,
    [Intent.GREETING]: RiskLevel.LOW,
    [Intent.UNKNOWN]: RiskLevel.LOW
};

// Keywords that indicate higher risk
const HIGH_RISK_KEYWORDS = [
    'delete', 'remove', 'cancel', 'unsubscribe', 'terminate',
    'payment', 'transfer', 'money', 'bank', 'credit card',
    'urgent', 'immediately', 'right now'
];

// Keywords that should be blocked
const BLOCKED_KEYWORDS = [
    'password', 'credential', 'login', 'signin', 'sign in',
    'private key', 'secret', 'api key', 'token', 'access key',
    'ssn', 'social security', 'credit card number', 'cvv',
    'hack', 'crack', 'bypass', 'exploit'
];

export interface RiskAssessment {
    level: RiskLevel;
    reason: string;
    warnings: string[];
    suggestions: string[];
}

export class RiskService {
    /**
     * Assess the risk level of an action
     */
    assessRisk(
        classification: ClassificationResult,
        originalMessage: string
    ): RiskAssessment {
        const lowerMessage = originalMessage.toLowerCase();
        const warnings: string[] = [];
        const suggestions: string[] = [];

        // Check for blocked content first
        for (const keyword of BLOCKED_KEYWORDS) {
            if (lowerMessage.includes(keyword)) {
                return {
                    level: RiskLevel.BLOCKED,
                    reason: `Detected sensitive keyword: "${keyword}"`,
                    warnings: ['This request involves sensitive information that AURA cannot handle for security reasons.'],
                    suggestions: ['Please handle sensitive information directly through official channels.']
                };
            }
        }

        // Get base risk level from intent
        let riskLevel = INTENT_RISK_MAP[classification.intent] || RiskLevel.MEDIUM;

        // Check for high risk keywords
        for (const keyword of HIGH_RISK_KEYWORDS) {
            if (lowerMessage.includes(keyword)) {
                if (riskLevel === RiskLevel.LOW) {
                    riskLevel = RiskLevel.MEDIUM;
                } else if (riskLevel === RiskLevel.MEDIUM) {
                    riskLevel = RiskLevel.HIGH;
                }
                warnings.push(`Detected potentially risky keyword: "${keyword}"`);
            }
        }

        // Specific checks per intent
        switch (classification.intent) {
            case Intent.SEND_MESSAGE:
                warnings.push('AURA will prepare the message but will NOT send it automatically.');
                suggestions.push('You will need to review and send the message yourself.');
                break;

            case Intent.DRAFT_EMAIL:
                warnings.push('AURA will open Gmail with a draft but will NOT send it automatically.');
                suggestions.push('Please review the content before sending.');
                break;

            case Intent.OPEN_WEB_APP:
                suggestions.push('A new tab will be opened with the requested web app.');
                break;

            case Intent.PLAY_MEDIA:
                suggestions.push('Media will be searched and opened in a new tab.');
                break;
        }

        // Generate reason
        const reason = this.generateReason(classification.intent, riskLevel);

        return {
            level: riskLevel,
            reason,
            warnings,
            suggestions
        };
    }

    /**
     * Generate a human-readable reason for the risk level
     */
    private generateReason(intent: Intent, level: RiskLevel): string {
        switch (level) {
            case RiskLevel.LOW:
                return `This is a low-risk action (${intent}). It will be executed directly.`;
            case RiskLevel.MEDIUM:
                return `This action (${intent}) requires your confirmation before proceeding.`;
            case RiskLevel.HIGH:
                return `This is a high-risk action (${intent}). Please review carefully before confirming.`;
            case RiskLevel.BLOCKED:
                return `This action is blocked for security reasons.`;
            default:
                return 'Risk level unknown.';
        }
    }

    /**
     * Check if action requires confirmation
     */
    requiresConfirmation(riskLevel: RiskLevel): boolean {
        return riskLevel === RiskLevel.MEDIUM || riskLevel === RiskLevel.HIGH;
    }

    /**
     * Check if action is blocked
     */
    isBlocked(riskLevel: RiskLevel): boolean {
        return riskLevel === RiskLevel.BLOCKED;
    }
}
