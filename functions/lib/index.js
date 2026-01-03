"use strict";
/**
 * AURA - Firebase Cloud Functions Entry Point
 * Main API endpoints for the AURA intelligent assistant
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const gemini_service_1 = require("./services/gemini.service");
const intent_service_1 = require("./services/intent.service");
const risk_service_1 = require("./services/risk.service");
const safety_service_1 = require("./services/safety.service");
const action_service_1 = require("./services/action.service");
const memory_service_1 = require("./services/memory.service");
const types_1 = require("./types");
// Initialize Firebase Admin
admin.initializeApp();
// Initialize Express app with CORS
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: true }));
app.use(express_1.default.json({ limit: '10mb' }));
// Hardcoded API key for hackathon
const GEMINI_API_KEY = 'AIzaSyDkEuTjnW08gAnzXVV2O149AuVOxyjxj2I';
// Initialize services
const geminiService = new gemini_service_1.GeminiService(GEMINI_API_KEY);
const intentService = new intent_service_1.IntentService(geminiService);
const riskService = new risk_service_1.RiskService();
const safetyService = new safety_service_1.SafetyService();
const actionService = new action_service_1.ActionService(intentService, geminiService);
const memoryService = new memory_service_1.MemoryService(admin.firestore());
/**
 * Main command processing endpoint
 */
app.post('/process', async (req, res) => {
    try {
        const request = req.body;
        if (!request.message || typeof request.message !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }
        const executionTrace = [];
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
            status: riskAssessment.level === types_1.RiskLevel.BLOCKED ? 'blocked' :
                riskAssessment.level === types_1.RiskLevel.HIGH ? 'warning' : 'completed'
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
                riskLevel: types_1.RiskLevel.BLOCKED,
                executionTrace,
                requiresConfirmation: false,
                error: safetyCheck.warnings.join(' ')
            });
        }
        // Check if confirmation is required
        const requiresConfirmation = riskService.requiresConfirmation(riskAssessment.level);
        // Phase 4: Plan the action (needed even for confirmation UI)
        const actionPlan = await actionService.planAction(classification, request.message, stepNum);
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
            });
        }
        // Step 4+: Plan and execute action
        let response;
        // Special handling for vision analysis
        if (classification.intent === types_1.Intent.VISION_ANALYZE && request.imageBase64) {
            const visionResponse = await geminiService.analyzeImage(request.imageBase64, request.message);
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
                    type: types_1.ActionType.DISPLAY,
                    content: visionResponse,
                    description: 'Image analysis'
                }
            };
        }
        else {
            // Regular action planning
            const actionPlan = await actionService.planAction(classification, request.message, stepNum);
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
                await memoryService.recordAction(request.userId, classification.intent, request.message.substring(0, 100), classification.entities.platform);
            }
            catch (memoryError) {
                console.error('Memory recording error:', memoryError);
                // Don't fail the request for memory errors
            }
        }
        return res.json(response);
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
exports.api = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map