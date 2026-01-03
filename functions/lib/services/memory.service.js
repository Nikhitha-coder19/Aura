"use strict";
/**
 * AURA - Memory Service
 * Manages user preferences and action history in Firestore
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryService = void 0;
const admin = __importStar(require("firebase-admin"));
const COLLECTION_NAME = 'aura_memory';
const MAX_RECENT_ACTIONS = 20;
const MAX_FREQUENT_ACTIONS = 10;
class MemoryService {
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Get or create memory for a user
     */
    async getMemory(userId) {
        const docRef = this.db.collection(COLLECTION_NAME).doc(userId);
        const doc = await docRef.get();
        if (doc.exists) {
            const data = doc.data();
            return {
                userId,
                preferences: data.preferences || {},
                recentActions: data.recentActions || [],
                frequentActions: data.frequentActions || [],
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date()
            };
        }
        // Create new memory
        const newMemory = {
            userId,
            preferences: {},
            recentActions: [],
            frequentActions: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        await docRef.set(newMemory);
        return newMemory;
    }
    /**
     * Record an action to memory
     */
    async recordAction(userId, intent, description, platform) {
        const docRef = this.db.collection(COLLECTION_NAME).doc(userId);
        const memory = await this.getMemory(userId);
        // Add to recent actions
        const actionSummary = {
            intent,
            description,
            timestamp: new Date()
        };
        memory.recentActions.unshift(actionSummary);
        if (memory.recentActions.length > MAX_RECENT_ACTIONS) {
            memory.recentActions = memory.recentActions.slice(0, MAX_RECENT_ACTIONS);
        }
        // Update frequent actions
        const existingFrequent = memory.frequentActions.find(a => a.intent === intent && a.platform === platform);
        if (existingFrequent) {
            existingFrequent.count++;
        }
        else {
            memory.frequentActions.push({
                intent,
                platform,
                count: 1
            });
        }
        // Sort and limit frequent actions
        memory.frequentActions.sort((a, b) => b.count - a.count);
        if (memory.frequentActions.length > MAX_FREQUENT_ACTIONS) {
            memory.frequentActions = memory.frequentActions.slice(0, MAX_FREQUENT_ACTIONS);
        }
        memory.updatedAt = new Date();
        await docRef.set(memory);
    }
    /**
     * Update a preference
     */
    async updatePreference(userId, key, value) {
        const docRef = this.db.collection(COLLECTION_NAME).doc(userId);
        await docRef.update({
            [`preferences.${key}`]: value,
            updatedAt: new Date()
        });
    }
    /**
     * Delete a preference
     */
    async deletePreference(userId, key) {
        const docRef = this.db.collection(COLLECTION_NAME).doc(userId);
        await docRef.update({
            [`preferences.${key}`]: admin.firestore.FieldValue.delete(),
            updatedAt: new Date()
        });
    }
    /**
     * Clear all memory for a user
     */
    async clearMemory(userId) {
        const docRef = this.db.collection(COLLECTION_NAME).doc(userId);
        await docRef.delete();
    }
    /**
     * Generate a summary of memory for context
     */
    summarizeForContext(memory) {
        const parts = [];
        // Add preferences
        const prefEntries = Object.entries(memory.preferences);
        if (prefEntries.length > 0) {
            parts.push('User preferences:');
            prefEntries.slice(0, 5).forEach(([key, value]) => {
                parts.push(`- ${key}: ${value}`);
            });
        }
        // Add frequent actions
        if (memory.frequentActions.length > 0) {
            parts.push('\nFrequently used actions:');
            memory.frequentActions.slice(0, 3).forEach(action => {
                parts.push(`- ${action.intent}${action.platform ? ` (${action.platform})` : ''}: ${action.count} times`);
            });
        }
        // Add recent actions (last 3)
        if (memory.recentActions.length > 0) {
            parts.push('\nRecent actions:');
            memory.recentActions.slice(0, 3).forEach(action => {
                parts.push(`- ${action.description}`);
            });
        }
        return parts.join('\n');
    }
}
exports.MemoryService = MemoryService;
//# sourceMappingURL=memory.service.js.map