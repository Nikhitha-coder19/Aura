"use strict";
/**
 * AURA - Risk Assessment Service
 * Evaluates the risk level of each action
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskService = void 0;
const types_1 = require("../types");
// Default risk levels per intent
const INTENT_RISK_MAP = {
    [types_1.Intent.OPEN_WEB_APP]: types_1.RiskLevel.LOW,
    [types_1.Intent.SEARCH]: types_1.RiskLevel.LOW,
    [types_1.Intent.ASK_QUESTION]: types_1.RiskLevel.LOW,
    [types_1.Intent.PLAY_MEDIA]: types_1.RiskLevel.LOW,
    [types_1.Intent.SUMMARIZE]: types_1.RiskLevel.LOW,
    [types_1.Intent.SEND_MESSAGE]: types_1.RiskLevel.MEDIUM,
    [types_1.Intent.DRAFT_EMAIL]: types_1.RiskLevel.MEDIUM,
    [types_1.Intent.VISION_ANALYZE]: types_1.RiskLevel.LOW,
    [types_1.Intent.GREETING]: types_1.RiskLevel.LOW,
    [types_1.Intent.UNKNOWN]: types_1.RiskLevel.LOW
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
class RiskService {
    /**
     * Assess the risk level of an action
     */
    assessRisk(classification, originalMessage) {
        const lowerMessage = originalMessage.toLowerCase();
        const warnings = [];
        const suggestions = [];
        // Check for blocked content first
        for (const keyword of BLOCKED_KEYWORDS) {
            if (lowerMessage.includes(keyword)) {
                return {
                    level: types_1.RiskLevel.BLOCKED,
                    reason: `Detected sensitive keyword: "${keyword}"`,
                    warnings: ['This request involves sensitive information that AURA cannot handle for security reasons.'],
                    suggestions: ['Please handle sensitive information directly through official channels.']
                };
            }
        }
        // Get base risk level from intent
        let riskLevel = INTENT_RISK_MAP[classification.intent] || types_1.RiskLevel.MEDIUM;
        // Check for high risk keywords
        for (const keyword of HIGH_RISK_KEYWORDS) {
            if (lowerMessage.includes(keyword)) {
                if (riskLevel === types_1.RiskLevel.LOW) {
                    riskLevel = types_1.RiskLevel.MEDIUM;
                }
                else if (riskLevel === types_1.RiskLevel.MEDIUM) {
                    riskLevel = types_1.RiskLevel.HIGH;
                }
                warnings.push(`Detected potentially risky keyword: "${keyword}"`);
            }
        }
        // Specific checks per intent
        switch (classification.intent) {
            case types_1.Intent.SEND_MESSAGE:
                warnings.push('AURA will prepare the message but will NOT send it automatically.');
                suggestions.push('You will need to review and send the message yourself.');
                break;
            case types_1.Intent.DRAFT_EMAIL:
                warnings.push('AURA will open Gmail with a draft but will NOT send it automatically.');
                suggestions.push('Please review the content before sending.');
                break;
            case types_1.Intent.OPEN_WEB_APP:
                suggestions.push('A new tab will be opened with the requested web app.');
                break;
            case types_1.Intent.PLAY_MEDIA:
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
    generateReason(intent, level) {
        switch (level) {
            case types_1.RiskLevel.LOW:
                return `This is a low-risk action (${intent}). It will be executed directly.`;
            case types_1.RiskLevel.MEDIUM:
                return `This action (${intent}) requires your confirmation before proceeding.`;
            case types_1.RiskLevel.HIGH:
                return `This is a high-risk action (${intent}). Please review carefully before confirming.`;
            case types_1.RiskLevel.BLOCKED:
                return `This action is blocked for security reasons.`;
            default:
                return 'Risk level unknown.';
        }
    }
    /**
     * Check if action requires confirmation
     */
    requiresConfirmation(riskLevel) {
        return riskLevel === types_1.RiskLevel.MEDIUM || riskLevel === types_1.RiskLevel.HIGH;
    }
    /**
     * Check if action is blocked
     */
    isBlocked(riskLevel) {
        return riskLevel === types_1.RiskLevel.BLOCKED;
    }
}
exports.RiskService = RiskService;
//# sourceMappingURL=risk.service.js.map