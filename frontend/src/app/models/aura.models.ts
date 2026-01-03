export enum Intent {
    OPEN_WEB_APP = 'OPEN_WEB_APP',
    SEND_MESSAGE = 'SEND_MESSAGE',
    DRAFT_EMAIL = 'DRAFT_EMAIL',
    SUMMARIZE = 'SUMMARIZE',
    PLAY_MEDIA = 'PLAY_MEDIA',
    SEARCH = 'SEARCH',
    ASK_QUESTION = 'ASK_QUESTION',
    VISION_ANALYZE = 'VISION_ANALYZE',
    UNKNOWN = 'UNKNOWN'
}

export enum RiskLevel {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    BLOCKED = 'BLOCKED'
}

export enum ActionType {
    OPEN_URL = 'OPEN_URL',
    DRAFT_CONTENT = 'DRAFT_CONTENT',
    DISPLAY = 'DISPLAY',
    NONE = 'NONE'
}

export interface ExecutionStep {
    step: number;
    label: string;
    value: string;
    status: 'pending' | 'completed' | 'warning' | 'error' | 'blocked';
}

export interface Action {
    type: ActionType;
    url?: string;
    content?: string;
    platform?: string;
    description?: string;
}

export interface AuraRequest {
    message: string;
    userId?: string;
    imageBase64?: string;
    confirmed?: boolean;
}

export interface AuraResponse {
    success: boolean;
    message: string;
    intent: Intent;
    riskLevel: RiskLevel;
    executionTrace: ExecutionStep[];
    action?: Action;
    requiresConfirmation: boolean;
    error?: string;
}

export interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'aura';
    timestamp: Date;
    status?: 'sending' | 'sent' | 'error';
    executionTrace?: ExecutionStep[];
    action?: Action;
    riskLevel?: RiskLevel;
    requiresConfirmation?: boolean;
    image?: string;
}
