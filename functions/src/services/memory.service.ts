/**
 * AURA - Memory Service
 * Manages user preferences and action history in Firestore
 */

import * as admin from 'firebase-admin';
import { Memory, ActionSummary, Intent } from '../types';

const COLLECTION_NAME = 'aura_memory';
const MAX_RECENT_ACTIONS = 20;
const MAX_FREQUENT_ACTIONS = 10;

export class MemoryService {
    private db: admin.firestore.Firestore;

    constructor(db: admin.firestore.Firestore) {
        this.db = db;
    }

    /**
     * Get or create memory for a user
     */
    async getMemory(userId: string): Promise<Memory> {
        const docRef = this.db.collection(COLLECTION_NAME).doc(userId);
        const doc = await docRef.get();

        if (doc.exists) {
            const data = doc.data()!;
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
        const newMemory: Memory = {
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
    async recordAction(
        userId: string,
        intent: Intent,
        description: string,
        platform?: string
    ): Promise<void> {
        const docRef = this.db.collection(COLLECTION_NAME).doc(userId);
        const memory = await this.getMemory(userId);

        // Add to recent actions
        const actionSummary: ActionSummary = {
            intent,
            description,
            timestamp: new Date()
        };

        memory.recentActions.unshift(actionSummary);
        if (memory.recentActions.length > MAX_RECENT_ACTIONS) {
            memory.recentActions = memory.recentActions.slice(0, MAX_RECENT_ACTIONS);
        }

        // Update frequent actions
        const existingFrequent = memory.frequentActions.find(
            a => a.intent === intent && a.platform === platform
        );

        if (existingFrequent) {
            existingFrequent.count++;
        } else {
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
    async updatePreference(userId: string, key: string, value: string): Promise<void> {
        const docRef = this.db.collection(COLLECTION_NAME).doc(userId);
        await docRef.update({
            [`preferences.${key}`]: value,
            updatedAt: new Date()
        });
    }

    /**
     * Delete a preference
     */
    async deletePreference(userId: string, key: string): Promise<void> {
        const docRef = this.db.collection(COLLECTION_NAME).doc(userId);
        await docRef.update({
            [`preferences.${key}`]: admin.firestore.FieldValue.delete(),
            updatedAt: new Date()
        });
    }

    /**
     * Clear all memory for a user
     */
    async clearMemory(userId: string): Promise<void> {
        const docRef = this.db.collection(COLLECTION_NAME).doc(userId);
        await docRef.delete();
    }

    /**
     * Generate a summary of memory for context
     */
    summarizeForContext(memory: Memory): string {
        const parts: string[] = [];

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
