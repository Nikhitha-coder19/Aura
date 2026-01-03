/**
 * AURA - Safety Gate Service
 * Enforces safety rules and validates actions before execution
 */

import { Intent, RiskLevel, AuraRequest, ExecutionStep } from '../types';
import { RiskAssessment } from './risk.service';

// Maximum message length to prevent abuse
const MAX_MESSAGE_LENGTH = 10000;

// Maximum image size in bytes (5MB)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export interface SafetyCheckResult {
    passed: boolean;
    blocked: boolean;
    reason: string;
    warnings: string[];
}

export class SafetyService {
    /**
     * Perform comprehensive safety check on request
     */
    checkSafety(
        request: AuraRequest,
        intent: Intent,
        riskAssessment: RiskAssessment
    ): SafetyCheckResult {
        const warnings: string[] = [];

        // Check if already blocked by risk assessment
        if (riskAssessment.level === RiskLevel.BLOCKED) {
            return {
                passed: false,
                blocked: true,
                reason: riskAssessment.reason,
                warnings: riskAssessment.warnings
            };
        }

        // Check message length
        if (request.message.length > MAX_MESSAGE_LENGTH) {
            return {
                passed: false,
                blocked: true,
                reason: 'Message exceeds maximum allowed length.',
                warnings: ['Please shorten your message and try again.']
            };
        }

        // Check for vision request without image
        if (intent === Intent.VISION_ANALYZE && !request.imageBase64) {
            return {
                passed: false,
                blocked: false,
                reason: 'Vision analysis requested but no image provided.',
                warnings: ['Please upload an image to analyze.']
            };
        }

        // Check image size if provided
        if (request.imageBase64) {
            const imageSize = Buffer.from(request.imageBase64, 'base64').length;
            if (imageSize > MAX_IMAGE_SIZE) {
                return {
                    passed: false,
                    blocked: true,
                    reason: 'Image exceeds maximum allowed size (5MB).',
                    warnings: ['Please upload a smaller image.']
                };
            }
        }

        // Check for auto-send attempts (should never auto-send)
        if ((intent === Intent.SEND_MESSAGE || intent === Intent.DRAFT_EMAIL) && !request.confirmed) {
            warnings.push('AURA will NOT automatically send messages. You must confirm and send manually.');
        }

        // Validate entities for specific intents
        const entityWarnings = this.validateEntities(intent, request);
        warnings.push(...entityWarnings);

        return {
            passed: true,
            blocked: false,
            reason: 'Safety check passed.',
            warnings
        };
    }

    /**
     * Validate required entities for specific intents
     */
    private validateEntities(intent: Intent, request: AuraRequest): string[] {
        const warnings: string[] = [];

        switch (intent) {
            case Intent.SEND_MESSAGE:
                if (!request.message.toLowerCase().includes('to ')) {
                    warnings.push('No recipient specified. AURA will open the messaging app for you to select a contact.');
                }
                break;

            case Intent.DRAFT_EMAIL:
                if (!request.message.toLowerCase().includes('to ') && !request.message.toLowerCase().includes('@')) {
                    warnings.push('No recipient specified. AURA will open a blank compose window.');
                }
                break;
        }

        return warnings;
    }

    /**
     * Check if an action can proceed without confirmation
     */
    canAutoExecute(riskLevel: RiskLevel, confirmed: boolean): boolean {
        if (riskLevel === RiskLevel.BLOCKED) {
            return false;
        }
        if (riskLevel === RiskLevel.LOW) {
            return true;
        }
        return confirmed === true;
    }

    /**
     * Generate execution step for safety check
     */
    generateSafetyStep(result: SafetyCheckResult, stepNumber: number): ExecutionStep {
        if (result.blocked) {
            return {
                step: stepNumber,
                label: 'Safety check',
                value: 'BLOCKED - ' + result.reason,
                status: 'blocked'
            };
        }

        if (!result.passed) {
            return {
                step: stepNumber,
                label: 'Safety check',
                value: result.reason,
                status: 'warning'
            };
        }

        const requiresConfirmation = result.warnings.length > 0;
        return {
            step: stepNumber,
            label: 'Safety check',
            value: requiresConfirmation ? 'Confirmation required' : 'Passed',
            status: requiresConfirmation ? 'warning' : 'completed'
        };
    }
}
