import requests from '@/api/core/requests';

export type AIConfirmMode = 'auto' | 'auto_review' | 'balanced' | 'always';
export type AIBuiltinAPIType = 'openai' | 'openai_responses' | 'anthropic';
export type AIBuiltinPresetId = 'openai' | 'anthropic' | 'deepseek' | 'openrouter' | 'qwen' | 'kimi' | 'glm' | 'xiaomi' | 'ollama' | 'custom';

export const AI_CONTEXT_WINDOW_MAX = 2_000_000;
export const AI_MAX_OUTPUT_TOKENS = 131_072;
export const AI_CUSTOM_SYSTEM_PROMPT_MAX = 8000;

export interface BuiltinAPIProfile {
    id: string;
    name: string;
    presetId: AIBuiltinPresetId;
    apiType: AIBuiltinAPIType;
    baseUrl: string;
    apiKey: string;
    model: string;
    models: string[];
    customRequestBody: Record<string, unknown>;
    contextWindow: number;
    maxOutputTokens: number;
    maxRetries: number;
    userAgent: string;
    httpProxy: string;
}

export interface AIBuiltinProviderPreset {
    id: AIBuiltinPresetId;
    name: string;
    baseUrl: string;
    model: string;
    models: string[];
    apiType?: AIBuiltinAPIType;
}

export const AI_BUILTIN_PROVIDER_PRESETS: AIBuiltinProviderPreset[] = [
    {id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: '', models: []},
    {id: 'anthropic', name: 'Anthropic', baseUrl: 'https://api.anthropic.com', model: '', models: [], apiType: 'anthropic'},
    {id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: '', models: []},
    {id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: '', models: []},
    {id: 'qwen', name: 'Qwen', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: '', models: []},
    {id: 'kimi', name: 'Kimi', baseUrl: 'https://api.moonshot.ai/v1', model: '', models: []},
    {id: 'glm', name: 'GLM', baseUrl: 'https://api.z.ai/api/paas/v4', model: '', models: []},
    {id: 'xiaomi', name: 'Xiaomi', baseUrl: 'https://token-plan-cn.xiaomimimo.com/v1', model: '', models: []},
    {id: 'ollama', name: 'Ollama', baseUrl: 'http://localhost:11434/v1', model: '', models: []},
    {id: 'custom', name: 'Custom', baseUrl: 'https://api.openai.com/v1', model: '', models: []},
];

export interface AISettings {
    enabled: boolean;
    disclaimerAccepted: boolean;
    builtin: {
        activeProfileId: string;
        profiles: BuiltinAPIProfile[];
    };
    confirmMode: AIConfirmMode;
    approvalReviewProfileId: string;
    approvalReviewModel: string;
    approvalReviewTimeoutSecs: number;
    commandTimeoutSecs: number;
    includeHostRemark: boolean;
    customSystemPrompt: string;
}

export const AI_SETTINGS_PROPERTY_KEY = 'ai-settings';

export const DEFAULT_AI_PROFILE: BuiltinAPIProfile = {
    id: 'profile-1',
    name: 'OpenAI',
    presetId: 'openai',
    apiType: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: '',
    models: [],
    customRequestBody: {},
    contextWindow: 128_000,
    maxOutputTokens: 4096,
    maxRetries: 3,
    userAgent: '',
    httpProxy: '',
};

const DEFAULT_AI_SETTINGS: AISettings = {
    enabled: false,
    disclaimerAccepted: false,
    builtin: {
        activeProfileId: '',
        profiles: [],
    },
    confirmMode: 'balanced',
    approvalReviewProfileId: '',
    approvalReviewModel: '',
    approvalReviewTimeoutSecs: 60,
    commandTimeoutSecs: 30,
    includeHostRemark: false,
    customSystemPrompt: '',
};

export const getBuiltinPreset = (presetId?: string) => {
    return AI_BUILTIN_PROVIDER_PRESETS.find(item => item.id === presetId) || AI_BUILTIN_PROVIDER_PRESETS[0];
};

const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    const integer = Math.trunc(parsed);
    return integer >= min && integer <= max ? integer : fallback;
};

const uniqueModels = (models?: unknown[], activeModel?: string) => {
    return Array.from(new Set([
        activeModel,
        ...((Array.isArray(models) ? models : []).map(item => `${item}`.trim())),
    ].filter((item): item is string => typeof item === 'string' && item.trim() !== '')));
};

const migrateCustomRequestBody = (profile: Record<string, unknown>) => {
    if (profile.customRequestBody && typeof profile.customRequestBody === 'object' && !Array.isArray(profile.customRequestBody)) {
        return profile.customRequestBody as Record<string, unknown>;
    }
    const body: Record<string, unknown> = {};
    if (profile.reasoningProtocol === 'openai' && typeof profile.reasoningEffort === 'string' && profile.reasoningEffort) {
        body.reasoning_effort = profile.reasoningEffort;
    } else if (profile.reasoningProtocol === 'thinking_object') {
        body.thinking = {
            type: typeof profile.thinkingMode === 'string' && profile.thinkingMode ? profile.thinkingMode : 'enabled',
            ...(typeof profile.reasoningEffort === 'string' && profile.reasoningEffort ? {effort: profile.reasoningEffort} : {}),
        };
    } else if (profile.reasoningProtocol === 'qwen') {
        body.enable_thinking = profile.thinkingMode !== 'disabled';
        if (Number(profile.thinkingBudget) > 0) body.thinking_budget = Math.trunc(Number(profile.thinkingBudget));
    }
    return body;
};

export const normalizeBuiltinProfile = (profile?: Partial<BuiltinAPIProfile>, index = 0): BuiltinAPIProfile => {
    const source = (profile || {}) as unknown as Record<string, unknown>;
    const preset = getBuiltinPreset(`${source.presetId || ''}`);
    const models = uniqueModels(source.models as unknown[], `${source.model || ''}`);
    const model = `${source.model || ''}`.trim() || models[0] || preset.model;
    return {
        ...DEFAULT_AI_PROFILE,
        id: `${source.id || ''}`.trim() || `profile-${index + 1}`,
        name: `${source.name || ''}`.trim() || preset.name,
        presetId: preset.id,
        apiType: source.apiType === 'openai_responses' || source.apiType === 'anthropic'
            ? source.apiType
            : preset.apiType || 'openai',
        baseUrl: `${source.baseUrl || ''}`.trim().replace(/\/+$/, '') || preset.baseUrl,
        apiKey: `${source.apiKey || ''}`.trim(),
        model,
        models: uniqueModels(models, model),
        customRequestBody: migrateCustomRequestBody(source),
        contextWindow: clampInt(source.contextWindow, 1, AI_CONTEXT_WINDOW_MAX, DEFAULT_AI_PROFILE.contextWindow),
        maxOutputTokens: clampInt(source.maxOutputTokens, 1, AI_MAX_OUTPUT_TOKENS, DEFAULT_AI_PROFILE.maxOutputTokens),
        maxRetries: clampInt(source.maxRetries, 0, 10, DEFAULT_AI_PROFILE.maxRetries),
        userAgent: `${source.userAgent || ''}`.trim(),
        httpProxy: `${source.httpProxy || ''}`.trim(),
    };
};

export const normalizeAISettings = (settings?: Partial<AISettings>): AISettings => {
    const source = settings || {};
    const profiles = (source.builtin?.profiles || []).map((profile, index) => normalizeBuiltinProfile(profile, index));
    const requestedActiveProfileId = `${source.builtin?.activeProfileId || ''}`.trim();
    const activeProfileId = profiles.length === 0
        ? requestedActiveProfileId
        : profiles.some(profile => profile.id === requestedActiveProfileId)
            ? requestedActiveProfileId
            : profiles[0].id;
    const confirmMode = ['auto', 'auto_review', 'balanced', 'always'].includes(`${source.confirmMode || ''}`)
        ? source.confirmMode as AIConfirmMode
        : DEFAULT_AI_SETTINGS.confirmMode;
    return {
        enabled: source.disclaimerAccepted === true && source.enabled === true,
        disclaimerAccepted: source.disclaimerAccepted === true,
        builtin: {activeProfileId, profiles},
        confirmMode,
        approvalReviewProfileId: `${source.approvalReviewProfileId || ''}`.trim(),
        approvalReviewModel: `${source.approvalReviewModel || ''}`.trim(),
        approvalReviewTimeoutSecs: clampInt(source.approvalReviewTimeoutSecs, 10, 300, DEFAULT_AI_SETTINGS.approvalReviewTimeoutSecs),
        commandTimeoutSecs: clampInt(source.commandTimeoutSecs, 5, 300, DEFAULT_AI_SETTINGS.commandTimeoutSecs),
        includeHostRemark: source.includeHostRemark === true,
        customSystemPrompt: `${source.customSystemPrompt || ''}`.trim().slice(0, AI_CUSTOM_SYSTEM_PROMPT_MAX),
    };
};

export const parseAISettingsProperty = (value: unknown): AISettings => {
    if (typeof value === 'string' && value.trim()) {
        try {
            return normalizeAISettings(JSON.parse(value));
        } catch {
            return normalizeAISettings();
        }
    }
    if (value && typeof value === 'object') return normalizeAISettings(value as Partial<AISettings>);
    return normalizeAISettings();
};

export const stringifyAISettingsProperty = (settings: AISettings): string => {
    const normalized = normalizeAISettings(settings);
    return JSON.stringify({...normalized, builtin: {...normalized.builtin, profiles: []}});
};

class AISettingsApi {
    profiles = async () => await requests.get('/admin/ai/profiles') as BuiltinAPIProfile[];

    createProfile = async (profile: BuiltinAPIProfile) => {
        return await requests.post('/admin/ai/profiles', profile) as BuiltinAPIProfile;
    };

    updateProfile = async (id: string, profile: BuiltinAPIProfile) => {
        return await requests.put(`/admin/ai/profiles/${encodeURIComponent(id)}`, profile) as BuiltinAPIProfile;
    };

    deleteProfile = async (id: string) => {
        await requests.delete(`/admin/ai/profiles/${encodeURIComponent(id)}`);
    };

    models = async (profile: BuiltinAPIProfile) => {
        return await requests.post('/admin/ai/models', {profile}) as string[];
    };
}

const aiSettingsApi = new AISettingsApi();
export default aiSettingsApi;
