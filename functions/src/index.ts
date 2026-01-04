/**
 * AURA - Firebase Cloud Functions Entry Point
 * Main API endpoints for the AURA intelligent assistant
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';
import express from 'express';

import { GeminiService } from './services/gemini.service';
import { IntentService } from './services/intent.service';
import { RiskService } from './services/risk.service';
import { SafetyService } from './services/safety.service';
import { ActionService } from './services/action.service';
import { MemoryService } from './services/memory.service';
import {
    AuraRequest,
    AuraResponse,
    Intent,
    RiskLevel,
    ExecutionStep,
    ActionType
} from './types';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Express app with CORS
const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// Hardcoded API key for hackathon
const GEMINI_API_KEY = ["Enter API Key"];

// Initialize services
const geminiService = new GeminiService(GEMINI_API_KEY);
const intentService = new IntentService(geminiService);
const riskService = new RiskService();
const safetyService = new SafetyService();
const actionService = new ActionService(intentService, geminiService);
const memoryService = new MemoryService(admin.firestore());

/**
 * Main command processing endpoint
 */
app.post('/process', async (req, res) => {
    try {
        const request: AuraRequest = req.body;

        if (!request.message || typeof request.message !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        const executionTrace: ExecutionStep[] = [];
        let stepNum = 1;

        // Step 1: Classify intent
        const classification = await intentService.classifyIntent(request.message);
        executionTrace.push({
            step: stepNum++,
            label: 'Intent detected',
            value: classification.intent,
            status: 'completed'
        });

        // Step 2: Assess risk
        const riskAssessment = riskService.assessRisk(classification, request.message);
        executionTrace.push({
            step: stepNum++,
            label: 'Risk level',
            value: riskAssessment.level,
            status: riskAssessment.level === RiskLevel.BLOCKED ? 'blocked' :
                riskAssessment.level === RiskLevel.HIGH ? 'warning' : 'completed'
        });

        // Step 3: Safety check
        const safetyCheck = safetyService.checkSafety(request, classification.intent, riskAssessment);
        executionTrace.push(safetyService.generateSafetyStep(safetyCheck, stepNum++));

        // If blocked, return early
        if (safetyCheck.blocked) {
            return res.json({
                success: false,
                message: safetyCheck.reason,
                intent: classification.intent,
                riskLevel: RiskLevel.BLOCKED,
                executionTrace,
                requiresConfirmation: false,
                error: safetyCheck.warnings.join(' ')
            } as AuraResponse);
        }

        // Check if confirmation is required
        const requiresConfirmation = riskService.requiresConfirmation(riskAssessment.level);

        // Phase 4: Plan the action (needed even for confirmation UI)
        const actionPlan = await actionService.planAction(
            classification,
            request.message,
            stepNum
        );

        if (requiresConfirmation && !request.confirmed) {
            // Add the "Planned" step to trace so user sees what is waiting
            const proposedTrace = [...executionTrace, ...actionPlan.steps.map(s => ({ ...s, status: 'pending' }))];

            return res.json({
                success: true,
                message: riskAssessment.reason,
                intent: classification.intent,
                riskLevel: riskAssessment.level,
                executionTrace: proposedTrace,
                requiresConfirmation: true,
                action: actionPlan.action // Send the action so UI can show "Intended Action"
            } as AuraResponse);
        }

        // Step 4+: Plan and execute action
        let response: AuraResponse;

        // Special handling for vision analysis
        if (classification.intent === Intent.VISION_ANALYZE && request.imageBase64) {
            const visionResponse = await geminiService.analyzeImage(
                request.imageBase64,
                request.message
            );

            executionTrace.push({
                step: stepNum++,
                label: 'Action planned',
                value: 'Analyze image with Gemini Vision',
                status: 'completed'
            });

            executionTrace.push({
                step: stepNum++,
                label: 'Analysis complete',
                value: 'See response',
                status: 'completed'
            });

            response = {
                success: true,
                message: visionResponse,
                intent: classification.intent,
                riskLevel: riskAssessment.level,
                executionTrace,
                requiresConfirmation: false,
                action: {
                    type: ActionType.DISPLAY,
                    content: visionResponse,
                    description: 'Image analysis'
                }
            };
        } else {
            // Regular action planning
            const actionPlan = await actionService.planAction(
                classification,
                request.message,
                stepNum
            );

            executionTrace.push(...actionPlan.steps);

            response = {
                success: true,
                message: actionPlan.message,
                intent: classification.intent,
                riskLevel: riskAssessment.level,
                executionTrace,
                requiresConfirmation: false,
                action: actionPlan.action
            };
        }

        // Record action to memory (if userId provided)
        if (request.userId) {
            try {
                await memoryService.recordAction(
                    request.userId,
                    classification.intent,
                    request.message.substring(0, 100),
                    classification.entities.platform
                );
            } catch (memoryError) {
                console.error('Memory recording error:', memoryError);
                // Don't fail the request for memory errors
            }
        }

        return res.json(response);

    } catch (error) {
        console.error('Process error:', error);
        return res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            message: 'I encountered an error processing your request. Please try again.'
        });
    }
});

/**
 * Get user memory
 */
app.get('/memory/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const memory = await memoryService.getMemory(userId);
        return res.json({ success: true, memory });
    } catch (error) {
        console.error('Get memory error:', error);
        return res.status(500).json({ success: false, error: 'Failed to get memory' });
    }
});

/**
 * Update user preference
 */
app.put('/memory/:userId/preference', async (req, res) => {
    try {
        const { userId } = req.params;
        const { key, value } = req.body;

        if (!key) {
            return res.status(400).json({ success: false, error: 'Key is required' });
        }

        await memoryService.updatePreference(userId, key, value);
        return res.json({ success: true });
    } catch (error) {
        console.error('Update preference error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update preference' });
    }
});

/**
 * Clear user memory
 */
app.delete('/memory/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        await memoryService.clearMemory(userId);
        return res.json({ success: true });
    } catch (error) {
        console.error('Clear memory error:', error);
        return res.status(500).json({ success: false, error: 'Failed to clear memory' });
    }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
});

// Export the Express app as a Cloud Function
export const api = functions.https.onRequest(app);
