import i18n from '@/react-i18next/i18n';
import {type CSSProperties, useEffect, useRef, useState} from 'react';
import {
    App,
    Button,
    Checkbox,
    Drawer,
    Dropdown,
    Empty,
    Input,
    Modal,
    Popconfirm,
    Popover,
    Select,
    Spin,
    Tooltip,
    Typography,
} from 'antd';
import type {DrawerProps} from 'antd';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import copy from 'copy-to-clipboard';
import {Virtuoso, type VirtuosoHandle} from 'react-virtuoso';
import './AIAssistant.css';
import {useAIPreferences, type AIDisplayLevel} from '@/api/ai-preferences-api';
import AIPreferencesModal from './AIPreferencesModal';
import {buildAIMessageRows, type AIProcessRow} from './aiMessagePresentation';
import {
    AlertTriangleIcon,
    ArrowUpIcon,
    BrainIcon,
    BookOpenIcon,
    BotIcon,
    CircleDashedIcon,
    FileTextIcon,
    FilePenLineIcon,
    GlobeIcon,
    SearchIcon,
    ServerIcon,
    WrenchIcon,
    CheckCircle2Icon,
    ChevronDownIcon,
    ChevronRightIcon,
    ChevronsDownUpIcon,
    CopyIcon,
    EllipsisIcon,
    HistoryIcon,
    LoaderCircleIcon,
    MessageSquarePlusIcon,
    PencilIcon,
    SparklesIcon,
    SquareIcon,
    SettingsIcon,
    TerminalIcon,
    Trash2Icon,
    XCircleIcon,
} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import aiApi, {
    type AICacheUsage,
    type AIContextUsage,
    type AIConversation,
    type AIInboundMessage,
    type AIMessage,
    type AIOutboundMessage,
    type AIToolExecution,
} from '@/api/ai-api';
import {AIMessageMarkdown} from './AIMessageMarkdown';
import {createAIEventBuffer} from './aiEventBuffer';
import {createAISocketConnection} from './aiSocketConnection';
import {MOBILE_TOOL_DRAWER_STYLES} from '@/pages/access/terminal-tool-drawer';

type ConnectionState = 'connecting' | 'open' | 'closed' | 'error';

export type ChatItem =
    | {id: string; kind: 'user'; text: string; status?: 'queued' | 'failed'; clientMessageId?: string; persisted?: boolean}
    | {id: string; kind: 'assistant'; text: string; reasoning: string; reasoningStreaming?: boolean; streaming: boolean}
    | {id: string; kind: 'tool'; execution: AIToolExecution}
    | {id: string; kind: 'retry'; attempt: number; maxRetries: number; delayMs: number; reason: string}
    | {id: string; kind: 'error'; text: string};

interface Usage {
    prompt: number;
    completion: number;
    total: number;
    estimated?: boolean;
    context?: AIContextUsage;
    cache?: AICacheUsage;
}

interface Props {
    open?: boolean;
    drawer?: boolean;
    drawerPlacement?: DrawerProps['placement'];
    drawerSize?: DrawerProps['size'];
    embedded?: boolean;
    embeddedHeight?: number;
    assetId?: string;
    assetName?: string;
    title?: string;
    getContainer?: false | HTMLElement | (() => HTMLElement);
    onClose?: () => void;
}

let nextId = 1;
const genId = () => `ai-${Date.now()}-${nextId++}`;

const mergeToolExecution = (previous: AIToolExecution, incoming: AIToolExecution): AIToolExecution => ({
    ...previous,
    ...incoming,
    name: incoming.name || previous.name,
    arguments: incoming.arguments ?? previous.arguments,
    fileDiff: incoming.fileDiff ?? previous.fileDiff,
    approvalReview: incoming.approvalReview ?? previous.approvalReview,
    result: incoming.result ?? previous.result,
});

const cancelActiveTools = (items: ChatItem[]) => items.map(item => item.kind === 'tool' && ['reviewing', 'awaiting_approval', 'running'].includes(item.execution.state)
    ? {
        ...item,
        execution: {
            ...item.execution,
            state: 'cancelled' as const,
            result: {output: 'cancelled', exitCode: -1, durationMs: 0, cancelled: true},
        },
    }
    : item);

const AIAssistant = ({open = true, drawer = false, drawerPlacement = 'right', drawerSize = 'min(560px, 100vw)', embedded = false, embeddedHeight, assetId, assetName, title, getContainer, onClose}: Props) => {
    const {t} = useTranslation();
    const {message} = App.useApp();
    const queryClient = useQueryClient();
    const wsRef = useRef<WebSocket | null>(null);
    const [scrollRequest, setScrollRequest] = useState(0);
    const [connection, setConnection] = useState<ConnectionState>('closed');
    const [conversationId, setConversationId] = useState('');
    const conversationIdRef = useRef(conversationId);
    conversationIdRef.current = conversationId;
    const [input, setInput] = useState('');
    const [items, setItems] = useState<ChatItem[]>([]);
    const [busy, setBusy] = useState(false);
    const [usage, setUsage] = useState<Usage | null>(null);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [preferencesOpen, setPreferencesOpen] = useState(false);
    const [historySearch, setHistorySearch] = useState('');
    const [loadingConversationId, setLoadingConversationId] = useState('');
    const [submittingDecisionId, setSubmittingDecisionId] = useState('');
    const [rememberApproval, setRememberApproval] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState('');
    const [editConfirmOpen, setEditConfirmOpen] = useState(false);
    const [activeModel, setActiveModel] = useState('');

    const preferences = useAIPreferences(open);

    const historyQueryKey = ['ai-conversations', 'global'];
    const modelOptionsQuery = useQuery({
        queryKey: ['ai', 'model-options'],
        queryFn: aiApi.modelOptions,
        enabled: open,
    });
    const conversationsQuery = useQuery({
        queryKey: historyQueryKey,
        queryFn: aiApi.conversations,
        enabled: open && historyOpen,
    });

    const loadConversationMutation = useMutation({
        mutationFn: aiApi.conversation,
        onSuccess: (conversation) => {
            setConversationId(conversation.id);
            setActiveModel(conversation.agentModel?.trim() || modelOptionsQuery.data?.model?.trim() || '');
            setItems(itemsFromHistory(conversation.messages || []));
            setScrollRequest(value => value + 1);
            setUsage(usageFromConversation(conversation));
            setBusy(false);
            setEditingMessageId('');
            setEditConfirmOpen(false);
            setInput('');
            setHistoryOpen(false);
            sendMessage({type: 'load_history', conversationId: conversation.id});
        },
        onError: (error: Error) => message.error(t('ai_assistant.history_load_error', {message: error.message})),
        onSettled: () => setLoadingConversationId(''),
    });
    const deleteConversationMutation = useMutation({
        mutationFn: aiApi.deleteConversation,
        onSuccess: async (_, deletedId) => {
            if (deletedId === conversationId) resetConversation();
            await queryClient.invalidateQueries({queryKey: historyQueryKey});
        },
        onError: (error: Error) => message.error(t('ai_assistant.history_delete_error', {message: error.message})),
    });
    const clearConversationsMutation = useMutation({
        mutationFn: aiApi.clearConversations,
        onSuccess: async () => {
            resetConversation();
            await queryClient.invalidateQueries({queryKey: historyQueryKey});
        },
        onError: (error: Error) => message.error(t('ai_assistant.history_clear_error', {message: error.message})),
    });

    useEffect(() => {
        const defaultModel = modelOptionsQuery.data?.model?.trim();
        if (defaultModel) setActiveModel(current => current || defaultModel);
    }, [modelOptionsQuery.data]);

    useEffect(() => {
        if (!open) return;
        let eventBuffer = createAIEventBuffer(handleSocketEvent);
        const disconnect = createAISocketConnection({
            createSocket: () => new WebSocket(aiApi.buildWebSocketUrl()),
            onConnecting: () => setConnection('connecting'),
            onOpen: (ws, reconnected) => {
                wsRef.current = ws;
                setConnection('open');
                if (reconnected && conversationIdRef.current) {
                    ws.send(JSON.stringify({type: 'load_history', conversationId: conversationIdRef.current}));
                }
            },
            onClose: () => {
                wsRef.current = null;
                eventBuffer.dispose();
                eventBuffer = createAIEventBuffer(handleSocketEvent);
                setConnection('closed');
                setBusy(false);
                setSubmittingDecisionId('');
                setItems(current => cancelActiveTools(stopStreaming(current)).map(item =>
                    item.kind === 'user' && item.status === 'queued' ? {...item, status: 'failed' as const} : item));
            },
            onMessage: event => {
                try {
                    eventBuffer.push(JSON.parse(event.data) as AIOutboundMessage);
                } catch {
                    message.error(t('ai_assistant.invalid_response'));
                }
            },
        });
        return () => {
            disconnect();
            eventBuffer.dispose();
            wsRef.current = null;
        };
    }, [open]);

    const sendMessage = (payload: AIInboundMessage) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return false;
        ws.send(JSON.stringify(payload));
        return true;
    };

    const appendAssistant = (current: ChatItem[], delta: string, reasoning: boolean): ChatItem[] => {
        if (!delta) return current;
        const last = current[current.length - 1];
        if (last?.kind === 'assistant' && last.streaming) {
            const next = [...current];
            next[next.length - 1] = reasoning
                ? {...last, reasoning: last.reasoning + delta, reasoningStreaming: true}
                : {...last, text: last.text + delta, reasoningStreaming: false};
            return next;
        }
        return [...current, {id: genId(), kind: 'assistant', text: reasoning ? '' : delta, reasoning: reasoning ? delta : '', reasoningStreaming: reasoning, streaming: true}];
    };

    const handleSocketEvent = (event: AIOutboundMessage) => {
        if (event.type === 'conversation_created') {
            setConversationId(event.conversationId || event.conversation?.id || '');
            void queryClient.invalidateQueries({queryKey: historyQueryKey});
            return;
        }
        if (event.type === 'history_loaded' && event.conversation) {
            setConversationId(event.conversation.id);
            setActiveModel(current => event.conversation?.agentModel?.trim() || current);
            setItems(itemsFromHistory(event.conversation.messages || []));
            setScrollRequest(value => value + 1);
            setUsage(usageFromConversation(event.conversation));
            setBusy(false);
            return;
        }
        if (event.type === 'conversation_rewound' && event.conversation) {
            setConversationId(event.conversation.id);
            setActiveModel(current => event.conversation?.agentModel?.trim() || current);
            setItems(itemsFromHistory(event.conversation.messages || []));
            setScrollRequest(value => value + 1);
            setUsage(null);
            setBusy(true);
            setEditingMessageId('');
            setEditConfirmOpen(false);
            setInput('');
            return;
        }
        setItems(current => {
            let next = [...current];
            if (event.type === 'user_message') {
                const queuedIndex = event.clientMessageId
                    ? next.findIndex(item => item.kind === 'user' && (
                        item.clientMessageId === event.clientMessageId
                        || item.id === event.clientMessageId
                        || Boolean(event.messageId && item.id === event.messageId)
                    ))
                    : -1;
                if (queuedIndex >= 0) {
                    const queued = next[queuedIndex];
                    if (queued.kind === 'user') next[queuedIndex] = {...queued, id: event.messageId || queued.id, status: undefined, persisted: true};
                } else {
                    next.push({id: event.messageId || event.clientMessageId || genId(), kind: 'user', text: event.text || '', persisted: true});
                }
                setBusy(true);
            } else if (event.type === 'assistant_text') {
                next = appendAssistant(next, event.delta || event.text || '', false);
            } else if (event.type === 'assistant_reasoning') {
                next = appendAssistant(next, event.delta || event.text || '', true);
            } else if (event.type === 'tool_execution' && event.execution?.executionId) {
                next = stopStreaming(next);
                const index = next.findIndex(item => item.kind === 'tool' && item.execution.executionId === event.execution?.executionId);
                if (index >= 0) {
                    const existing = next[index];
                    if (existing.kind === 'tool') next[index] = {...existing, execution: mergeToolExecution(existing.execution, event.execution)};
                } else {
                    next.push({id: event.execution.executionId, kind: 'tool', execution: event.execution});
                }
                if (!['reviewing', 'awaiting_approval'].includes(event.execution.state)) {
                    setSubmittingDecisionId('');
                    setRememberApproval(false);
                }
            } else if (event.type === 'retrying') {
                next = stopStreaming(next);
                next.push({id: genId(), kind: 'retry', attempt: event.retryAttempt || 0, maxRetries: event.maxRetries || 0, delayMs: event.retryDelayMs || 0, reason: event.message || ''});
            } else if (event.type === 'error') {
                next = stopStreaming(next).map(item => item.kind === 'user' && event.clientMessageId && item.clientMessageId === event.clientMessageId
                    ? {...item, status: 'failed' as const}
                    : item);
                next.push({id: genId(), kind: 'error', text: event.message || t('ai_assistant.unknown_error')});
            } else if (event.type === 'done' || event.type === 'idle') {
                next = stopStreaming(next);
                if (event.type === 'idle') setBusy(false);
                void queryClient.invalidateQueries({queryKey: historyQueryKey});
            }
            return next;
        });
        if (event.type === 'usage') {
            setUsage({
                prompt: event.promptTokens || 0,
                completion: event.completionTokens || 0,
                total: event.totalTokens || 0,
                estimated: event.estimated,
                context: event.contextUsage,
                cache: event.cacheUsage,
            });
        }
    };

    const sendPrompt = () => {
        const text = input.trim();
        if (!text || connection !== 'open' || pendingTool) return;
        if (editingMessageId) {
            setEditConfirmOpen(true);
            return;
        }
        const clientMessageId = genId();
        const sent = sendMessage({
            type: 'prompt',
            text,
            model: activeModel || undefined,
            conversationId: conversationId || undefined,
            clientMessageId,
            hostMentions: currentHostMentions(),
        });
        if (!sent) return;
        setScrollRequest(value => value + 1);
        setItems(current => [...current, {id: clientMessageId, kind: 'user', text, status: 'queued', clientMessageId}]);
        setInput('');
        setBusy(true);
    };

    const currentHostMentions = () => assetId ? [{hostId: assetId, hostName: assetName || ''}] : [];

    const retryUserMessage = (item: Extract<ChatItem, {kind: 'user'}>) => {
        if (busy || connection !== 'open') return;
        const clientMessageId = genId();
        const sent = item.persisted && conversationId
            ? sendMessage({
                type: 'retry_from_message',
                text: item.text,
                model: activeModel || undefined,
                conversationId,
                messageId: item.id,
                clientMessageId,
                hostMentions: currentHostMentions(),
            })
            : sendMessage({
                type: 'prompt',
                text: item.text,
                model: activeModel || undefined,
                conversationId: conversationId || undefined,
                clientMessageId,
                hostMentions: currentHostMentions(),
            });
        if (!sent) return;
        setBusy(true);
        if (!item.persisted) {
            setItems(current => current.map(candidate => candidate.id === item.id && candidate.kind === 'user'
                ? {...candidate, id: clientMessageId, clientMessageId, status: 'queued'}
                : candidate));
        }
    };

    const editUserMessage = (item: Extract<ChatItem, {kind: 'user'}>) => {
        if (busy || !item.persisted || item.status) return;
        setEditingMessageId(item.id);
        setInput(item.text);
    };

    const cancelEditingMessage = () => {
        setEditingMessageId('');
        setEditConfirmOpen(false);
        setInput('');
    };

    const confirmEditedMessage = () => {
        const text = input.trim();
        if (!text || !editingMessageId || !conversationId || busy || connection !== 'open') return;
        const clientMessageId = genId();
        const sent = sendMessage({
            type: 'retry_from_message',
            text,
            model: activeModel || undefined,
            conversationId,
            messageId: editingMessageId,
            clientMessageId,
            hostMentions: currentHostMentions(),
        });
        if (!sent) return;
        setEditConfirmOpen(false);
        setBusy(true);
    };

    const cancelRun = () => {
        sendMessage({type: 'cancel'});
        setSubmittingDecisionId('');
        setItems(current => cancelActiveTools(stopStreaming(current)));
    };

    const respondToTool = (executionId: string, approved: boolean) => {
        if (submittingDecisionId === executionId) return;
        if (sendMessage({type: 'tool_decision', executionId, decision: approved ? 'approve' : 'reject', remember: approved && rememberApproval})) {
            setSubmittingDecisionId(executionId);
        }
    };

    function resetConversation() {
        sendMessage({type: 'reset'});
        setConversationId('');
        setItems([]);
        setInput('');
        setBusy(false);
        setUsage(null);
        setSubmittingDecisionId('');
        setEditingMessageId('');
        setEditConfirmOpen(false);
        setActiveModel(modelOptionsQuery.data?.model?.trim() || '');
    }

    const compactConversation = () => {
        if (busy || !conversationId) return;
        const executionId = `compact:${genId()}`;
        if (!sendMessage({type: 'compact', conversationId, executionId})) return;
        setItems(current => [...current, {id: executionId, kind: 'tool', execution: {executionId, name: 'conversation_compact', state: 'running'}}]);
    };

    const pendingTool = [...items].reverse().find((item): item is Extract<ChatItem, {kind: 'tool'}> => item.kind === 'tool' && item.execution.state === 'awaiting_approval');
    const availableModels = Array.from(new Set([
        activeModel,
        modelOptionsQuery.data?.model,
        ...(modelOptionsQuery.data?.models || []),
    ].map(model => model?.trim()).filter((model): model is string => Boolean(model))));
    const filteredConversations = (conversationsQuery.data || []).filter(item =>
        (item.title || t('ai_assistant.new_chat')).toLowerCase().includes(historySearch.trim().toLowerCase()),
    );
    const contextTokens = usage?.context?.totalTokens || usage?.total || 0;
    const contextWindow = modelOptionsQuery.data?.contextWindow || 0;
    const contextPercent = contextWindow > 0 ? `${((contextTokens / contextWindow) * 100).toFixed(1)}%` : '—';
    const cacheRate = usage?.cache?.inputTokens ? Math.min(100, Math.max(0, (usage.cache.readTokens / usage.cache.inputTokens) * 100)) : null;
    const contextRows = usage?.context ? [
        {key: 'messages', label: t('ai_assistant.context_messages'), tokens: usage.context.messageTokens, color: 'bg-blue-500'},
        {key: 'system', label: t('ai_assistant.context_system_prompt'), tokens: usage.context.systemPromptTokens, color: 'bg-violet-500'},
        {key: 'tools', label: t('ai_assistant.context_tool_definitions'), tokens: usage.context.toolDefinitionTokens, color: 'bg-amber-500'},
    ] : [];
    const contextDetails = (
        <div className="ai-context-details w-72 max-w-[calc(100vw-56px)] space-y-3">
            <div className="space-y-1">
                <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">{t('ai_assistant.context_details')}</span>
                    <span className="text-xl font-semibold tabular-nums">{contextPercent}</span>
                </div>
                <div className="text-xs tabular-nums text-gray-500">{t('ai_assistant.context_usage_detail', {count: contextTokens.toLocaleString(i18n.resolvedLanguage || i18n.language)})}</div>
                {usage ? <div className="text-[11px] text-gray-500">{usage.context?.estimated || usage.estimated ? t('ai_assistant.context_estimated') : t('ai_assistant.context_actual')}</div> : null}
            </div>
            {contextRows.length > 0 ? (
                <div className="space-y-2.5 border-t border-gray-200 pt-3 dark:border-white/15">
                    {contextRows.map(row => {
                        const percent = contextTokens > 0 ? Math.round((row.tokens / contextTokens) * 100) : 0;
                        return (
                            <div key={row.key} className="flex items-center gap-2 text-xs">
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${row.color}`}/>
                                <span className="min-w-0 flex-1 text-gray-500">{row.label}</span>
                                <span className="tabular-nums">{row.tokens.toLocaleString(i18n.resolvedLanguage || i18n.language)}</span>
                                <span className="w-8 text-right tabular-nums text-gray-500">{percent}%</span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="border-t border-gray-200 pt-3 text-xs text-gray-500 dark:border-white/15">
                    {t('ai_assistant.context_breakdown_unavailable')}
                </div>
            )}
            <div className="space-y-1.5 border-t border-gray-200 pt-3 dark:border-white/15">
                <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[11px] text-gray-500">{t('ai_assistant.cache_hit_rate')}</span>
                    <span className="text-sm font-medium tabular-nums">{cacheRate === null ? '—' : `${cacheRate.toFixed(1)}%`}</span>
                </div>
                {usage ? <div className="text-[10px] text-gray-500">{t('ai_assistant.usage_detail', {prompt: usage.prompt, completion: usage.completion})}</div> : null}
                {usage?.cache ? (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500">
                        <span>{t('ai_assistant.cache_read_tokens', {count: usage.cache.readTokens.toLocaleString(i18n.resolvedLanguage || i18n.language)})}</span>
                        <span>{t('ai_assistant.cache_input_tokens', {count: usage.cache.inputTokens.toLocaleString(i18n.resolvedLanguage || i18n.language)})}</span>
                        {usage.cache.creationTokens ? <span>{t('ai_assistant.cache_creation_tokens', {count: usage.cache.creationTokens.toLocaleString(i18n.resolvedLanguage || i18n.language)})}</span> : null}
                        <span>{t('ai_assistant.cache_request_count', {count: usage.cache.requestCount})}</span>
                    </div>
                ) : null}
            </div>
        </div>
    );

    const usageIndicator = (
        <Popover content={contextDetails} trigger="click" placement="bottomRight" arrow={false} classNames={{container: 'ai-context-popover'}}>
            <button type="button" aria-label={t('ai_assistant.context_details')} className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md px-1.5 text-xs text-gray-500 outline-none transition-colors hover:bg-black/[0.035] hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-200">
                <BrainIcon className="h-3.5 w-3.5"/>
                <span>{t('ai_assistant.context_usage')}</span>
                <span className="font-medium tabular-nums text-gray-700 dark:text-gray-200">{contextPercent}</span>
            </button>
        </Popover>
    );
    const assistantTitle = (
        <div className="flex min-w-0 items-center gap-2">
            <SparklesIcon className="h-3.5 w-3.5 shrink-0 text-gray-500"/>
            <Typography.Text strong ellipsis>{title || t('ai_assistant.title')}</Typography.Text>
        </div>
    );
    const assistantActions = (
        <div className="flex shrink-0 items-center gap-0.5">
            {usageIndicator}
            <Tooltip title={t('ai_assistant.history')}>
                <Button aria-label={t('ai_assistant.history')} type="text" size="small" icon={<HistoryIcon className="h-3.5 w-3.5"/>} onClick={() => setHistoryOpen(true)}/>
            </Tooltip>
            <Tooltip title={t('ai_assistant.new_chat')}>
                <Button aria-label={t('ai_assistant.new_chat')} type="text" size="small" disabled={!items.length && !busy} icon={<MessageSquarePlusIcon className="h-3.5 w-3.5"/>} onClick={resetConversation}/>
            </Tooltip>
            <Dropdown
                trigger={['click']}
                placement="bottomRight"
                menu={{
                    items: [{
                        key: 'settings',
                        label: t('ai_assistant.settings'),
                        icon: <SettingsIcon className="h-3.5 w-3.5"/>,
                    }, {
                        key: 'compact',
                        label: t('ai_assistant.compact'),
                        icon: <ChevronsDownUpIcon className="h-3.5 w-3.5"/>,
                        disabled: busy || !conversationId,
                    }],
                    onClick: ({key}) => {
                        if (key === 'compact') compactConversation();
                        if (key === 'settings') setPreferencesOpen(true);
                    },
                }}
            >
                <Button aria-label={t('actions.more')} title={t('actions.more')} type="text" size="small" icon={<EllipsisIcon className="h-3.5 w-3.5"/>}/>
            </Dropdown>
        </div>
    );

    const content = (
        <div tabIndex={-1} className="ai-assistant flex h-full min-h-0 min-w-0 flex-col overflow-hidden outline-none">
            {!drawer ? (
                <div className="shrink-0 border-b px-2.5 py-2 text-xs">
                    <div className="flex min-w-0 items-center justify-between gap-2">{assistantTitle}{assistantActions}</div>
                </div>
            ) : null}
            <MessageList
                showHostInfo={!embedded && !drawer}
                displayLevel={preferences.displayLevel}
                items={items}
                busy={busy}
                scrollRequest={scrollRequest}
                onCopy={text => {
                    if (copy(text)) message.success(t('general.copy_success'));
                }}
                onSendNow={item => sendMessage({type: 'send_now', clientMessageId: item.clientMessageId || item.id})}
                onRetry={retryUserMessage}
                onEdit={editUserMessage}
                actionsDisabled={busy}
            />

            {pendingTool ? (
                <div className="shrink-0 border-t bg-amber-50 px-3 py-2 dark:bg-amber-950/20">
                    <div className="flex items-center gap-2">
                        <AlertTriangleIcon className="h-4 w-4 shrink-0 text-amber-600"/>
                        <div className="min-w-0 flex-1 truncate text-xs font-medium text-amber-700 dark:text-amber-300">{t('ai_assistant.command_confirm')}</div>
                        <Button size="small" loading={submittingDecisionId === pendingTool.execution.executionId} onClick={() => respondToTool(pendingTool.execution.executionId, false)}>{t('ai_assistant.reject')}</Button>
                        <Button size="small" type="primary" loading={submittingDecisionId === pendingTool.execution.executionId} onClick={() => respondToTool(pendingTool.execution.executionId, true)}>{t('ai_assistant.approve')}</Button>
                    </div>
                    <div className="mt-1 pl-6">
                        <Checkbox checked={rememberApproval} onChange={event => setRememberApproval(event.target.checked)}>{t('ai_assistant.remember_approval')}</Checkbox>
                    </div>
                </div>
            ) : null}

            <div className="relative z-10 mt-auto shrink-0 border-t bg-white p-2 dark:bg-[#1e1f22]">
                <div className="relative overflow-hidden rounded-md border border-gray-300 bg-black/[0.02] transition-shadow focus-within:rounded-md focus-within:border-blue-500 focus-within:shadow-[0_0_0_2px_rgba(22,119,255,0.12)] dark:border-white/15 dark:bg-white/5">
                    {editingMessageId ? (
                        <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-2.5 py-1.5 text-xs text-blue-600 dark:border-white/10 dark:text-blue-400">
                            <span className="flex min-w-0 items-center gap-1.5"><PencilIcon className="h-3.5 w-3.5 shrink-0"/><span className="truncate">{t('ai_assistant.editing_message')}</span></span>
                            <Button type="text" size="small" onClick={cancelEditingMessage}>{t('actions.cancel')}</Button>
                        </div>
                    ) : null}
                    <Input.TextArea
                        variant="borderless"
                        autoSize={{minRows: 2, maxRows: 7}}
                        value={input}
                        onChange={event => setInput(event.target.value)}
                        onKeyDown={event => {
                            const isComposing = event.nativeEvent.isComposing || event.keyCode === 229;
                            if (event.key === 'Enter' && !event.shiftKey && !isComposing) {
                                event.preventDefault();
                                sendPrompt();
                            }
                        }}
                        styles={{textarea: {paddingRight: 48, paddingBottom: 36}}}
                        placeholder={pendingTool ? t('ai_assistant.pending_placeholder') : t('ai_assistant.placeholder')}
                    />
                    <div className="absolute bottom-1.5 left-1.5 right-12 z-10">
                        <Select
                            aria-label={t('ai_assistant.model')}
                            className="max-w-full"
                            style={{width: 'min(180px, 100%)'}}
                            size="small"
                            variant="borderless"
                            showSearch={{optionFilterProp: 'label'}}
                            loading={modelOptionsQuery.isLoading}
                            disabled={busy || Boolean(pendingTool) || availableModels.length === 0}
                            value={activeModel || undefined}
                            placeholder={t('ai_assistant.model_unavailable')}
                            options={availableModels.map(model => ({label: model, value: model}))}
                            onChange={setActiveModel}
                        />
                    </div>
                    <div className="absolute bottom-2 right-2 z-10">
                        {busy && !input.trim() ? (
                            <Tooltip title={t('ai_assistant.cancel')}><Button danger type="primary" shape="circle" size="small" icon={<SquareIcon className="h-3.5 w-3.5 fill-current"/>} onClick={cancelRun}/></Tooltip>
                        ) : (
                            <Tooltip title={t('ai_assistant.send')}><Button type="primary" shape="circle" size="small" icon={<ArrowUpIcon className="h-4 w-4"/>} disabled={!input.trim() || Boolean(pendingTool) || connection !== 'open'} onClick={sendPrompt}/></Tooltip>
                        )}
                    </div>
                </div>
            </div>

            <AIPreferencesModal open={preferencesOpen} onClose={() => setPreferencesOpen(false)}/>
            <HistoryModal
                open={historyOpen}
                search={historySearch}
                conversations={filteredConversations}
                currentId={conversationId}
                loading={conversationsQuery.isLoading || conversationsQuery.isFetching}
                loadingId={loadingConversationId}
                deletingId={deleteConversationMutation.isPending ? deleteConversationMutation.variables || '' : ''}
                clearing={clearConversationsMutation.isPending}
                hasConversations={(conversationsQuery.data?.length || 0) > 0}
                onClose={() => setHistoryOpen(false)}
                onSearch={setHistorySearch}
                onLoad={item => {
                    if (busy) return;
                    setLoadingConversationId(item.id);
                    loadConversationMutation.mutate(item.id);
                }}
                onDelete={id => deleteConversationMutation.mutate(id)}
                onClear={() => clearConversationsMutation.mutate()}
            />
            <Modal
                title={t('ai_assistant.edit_confirm_title')}
                open={editConfirmOpen}
                onOk={confirmEditedMessage}
                onCancel={() => setEditConfirmOpen(false)}
            >
                <Typography.Paragraph>{t('ai_assistant.edit_confirm_description')}</Typography.Paragraph>
            </Modal>
        </div>
    );

    const panelStyle = {
        '--ai-assistant-bubble-background': 'color-mix(in srgb, currentColor 6%, transparent)',
        '--ai-assistant-bubble-border': 'color-mix(in srgb, currentColor 14%, transparent)',
    } as CSSProperties;
    if (embedded) return <div className="h-full min-h-0 overflow-hidden bg-white dark:bg-[#1e1f22]" style={{...panelStyle, height: embeddedHeight}}>{content}</div>;
    if (!drawer) return <div className="h-full min-h-0 overflow-hidden border-y bg-white dark:bg-transparent" style={panelStyle}>{content}</div>;
    return (
        <Drawer title={assistantTitle} extra={assistantActions} placement={drawerPlacement} open={open} size={drawerSize} mask={false} closable={false} destroyOnHidden getContainer={getContainer} styles={{...MOBILE_TOOL_DRAWER_STYLES, body: {padding: 0, overflow: 'hidden'}}} onClose={onClose}>
            <div className="h-full min-h-0 overflow-hidden bg-white dark:bg-[#1e1f22]" style={panelStyle}>{content}</div>
        </Drawer>
    );
};

const stopStreaming = (items: ChatItem[]) => items.map(item => item.kind === 'assistant' && item.streaming ? {...item, streaming: false, reasoningStreaming: false} : item);

interface MessageActions {
    actionsDisabled: boolean;
    onCopy: (text: string) => void;
    onSendNow: (item: Extract<ChatItem, {kind: 'user'}>) => void;
    onRetry: (item: Extract<ChatItem, {kind: 'user'}>) => void;
    onEdit: (item: Extract<ChatItem, {kind: 'user'}>) => void;
}

interface MessageListContext extends MessageActions {
    items: ChatItem[];
    busy: boolean;
    expanded: Map<string, boolean>;
    displayLevel: AIDisplayLevel;
    hostColors: Map<string, number>;
    showHostInfo: boolean;
}

const messageListComponents = {
    Footer: ({context}: {context?: MessageListContext}) => <div className="px-3 pb-3">{context?.busy ? <LoadingBubble items={context.items}/> : null}</div>,
};

const MessageList = ({items, busy, scrollRequest, displayLevel, showHostInfo, ...actions}: MessageActions & {items: ChatItem[]; busy: boolean; scrollRequest: number; displayLevel: AIDisplayLevel; showHostInfo: boolean}) => {
    const rows = buildAIMessageRows(items, displayLevel, busy);
    const {t} = useTranslation();
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const atBottomRef = useRef(true);
    const [atBottom, setAtBottom] = useState(true);
    // 虚拟行离开视口后会卸载，将展开状态保留在列表中。
    const [expanded] = useState(() => new Map<string, boolean>());
    useEffect(() => {
        atBottomRef.current = true;
        virtuosoRef.current?.scrollToIndex({index: 'LAST', align: 'end'});
    }, [scrollRequest]);
    useEffect(() => {
        const ids = new Set(items.flatMap(item => [item.id, `${item.id}:reasoning`, `process:${item.kind === 'user' ? item.clientMessageId || item.id : item.id}`]));
        for (const id of expanded.keys()) {
            const anchor = id.replace(/:(running|approval|completed|stopped|failed)$/, '');
            if (!ids.has(id) && !ids.has(anchor)) expanded.delete(id);
        }
    }, [items, expanded]);
    const hostColors = new Map<string, number>();
    for (const item of items) {
        if (item.kind !== 'tool') continue;
        const args = item.execution.arguments || {};
        const key = toolStringArg(args, 'hostId') || toolStringArg(args, 'hostName');
        if (key && !hostColors.has(key)) hostColors.set(key, hostColors.size);
    }
    const context: MessageListContext = {...actions, items, busy, expanded, displayLevel, hostColors, showHostInfo};
    return <div className="relative h-0 min-h-0 flex-1 overflow-hidden pt-3 text-sm">
        {items.length === 0 ? <div className="px-3 pt-10 text-center text-gray-400">{t('ai_assistant.empty')}{busy ? <LoadingBubble items={items}/> : null}</div> : (
                <Virtuoso
                    ref={virtuosoRef}
                    className="h-full overflow-x-hidden"
                    data={rows}
                    context={context}
                    computeItemKey={(_index, item) => item.kind === 'user' ? item.clientMessageId || item.id : item.id}
                    itemContent={(index, item, context) => <div className={`px-3 ${item.kind === 'tool' ? 'pb-1' : item.kind === 'user' || item.kind === 'assistant' ? 'pb-6' : 'pb-3'} ${index > 0 && item.kind === 'user' ? 'pt-3' : ''}`}>{item.kind === 'process' ? <ProcessRow key={`${item.id}:${item.status}`} item={item} context={context}/> : <MessageItem item={item} {...context}/>}</div>}
                    components={messageListComponents}
                    initialTopMostItemIndex={{index: rows.length - 1, align: 'end'}}
                    increaseViewportBy={{top: 400, bottom: 200}}
                    followOutput="auto"
                    atBottomThreshold={4}
                    atBottomStateChange={value => {
                        atBottomRef.current = value;
                        setAtBottom(value);
                    }}
                    totalListHeightChanged={() => {
                        if (atBottomRef.current) virtuosoRef.current?.scrollToIndex({index: 'LAST', align: 'end'});
                    }}
                />
        )}
        {!atBottom && items.length > 0 ? <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2"><Button shape="circle" aria-label={t('ai_assistant.scroll_to_bottom')} title={t('ai_assistant.scroll_to_bottom')} icon={<ChevronDownIcon className="h-4 w-4"/>} onClick={() => {atBottomRef.current = true; virtuosoRef.current?.scrollToIndex({index: 'LAST', align: 'end'});}}/></div> : null}
    </div>;
};

const ProcessRow = ({item, context}: {item: AIProcessRow; context: MessageListContext}) => {
    const {t} = useTranslation();
    const [expanded, toggle] = useMessageExpanded(context.expanded, `${item.id}:${item.status}`, ['failed', 'stopped', 'approval'].includes(item.status));
    const latest = item.items[item.items.length - 1];
    const detail = latest?.kind === 'tool' ? formatToolExecution(latest.execution) : latest?.kind === 'assistant' ? latest.text.trim().split('\n').slice(-1)[0] : '';
    return <div className="min-w-0">
        <button type="button" aria-expanded={expanded} className="flex w-full min-w-0 items-center gap-1.5 py-1 text-left text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" onClick={toggle}>
            {item.status === 'running' ? <LoaderCircleIcon className="h-3.5 w-3.5 shrink-0 animate-spin"/> : item.status === 'failed' || item.status === 'stopped' ? <XCircleIcon className="h-3.5 w-3.5 shrink-0"/> : item.status === 'approval' ? <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0"/> : <CheckCircle2Icon className="h-3.5 w-3.5 shrink-0"/>}
            <span className="shrink-0" role="status">{t(`ai_assistant.process_${item.status}`)}</span>
            {item.toolCount > 0 ? <span className="shrink-0">· {t('ai_assistant.process_tools', {count: item.toolCount})}</span> : null}
            {context.displayLevel === 'standard' && item.status === 'running' && detail ? <span className="truncate">· {detail}</span> : null}
            {expanded ? <ChevronDownIcon className="ml-auto h-3.5 w-3.5 shrink-0"/> : <ChevronRightIcon className="ml-auto h-3.5 w-3.5 shrink-0"/>}
        </button>
        {expanded ? <div className="ml-1.5 space-y-1 border-l border-gray-200 py-1 pl-3 dark:border-white/10">{item.items.map(entry => <div key={entry.id} className={entry.kind === 'assistant' ? 'py-1' : undefined}><MessageItem item={entry} {...context} inProcess/></div>)}</div> : null}
    </div>;
};

const useMessageExpanded = (states: Map<string, boolean>, id: string, initial: boolean) => {
    const [expanded, setExpanded] = useState(() => states.get(id) ?? initial);
    useEffect(() => {
        states.set(id, expanded);
    }, [states, id, expanded]);
    const toggle = () => {
        states.set(id, !expanded);
        setExpanded(!expanded);
    };
    return [expanded, toggle] as const;
};

const MessageItem = ({item, expanded, hostColors, showHostInfo, inProcess = false, actionsDisabled, onCopy, onSendNow, onRetry, onEdit}: MessageActions & {
    item: ChatItem;
    expanded: Map<string, boolean>;
    hostColors: Map<string, number>;
    showHostInfo: boolean;
    inProcess?: boolean;
}) => {
    const {t} = useTranslation();
    if (item.kind === 'tool') {
        const args = item.execution.arguments || {};
        const key = toolStringArg(args, 'hostId') || toolStringArg(args, 'hostName');
        return <ToolItem execution={item.execution} onCopy={onCopy} expandedStates={expanded} itemId={item.id} hostColorIndex={hostColors.get(key) || 0} showHostInfo={showHostInfo}/>;
    }
    if (item.kind === 'retry') return <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-700 dark:text-amber-300">{t('ai_assistant.retrying', {attempt: item.attempt, max: item.maxRetries, seconds: Math.ceil(item.delayMs / 1000), reason: item.reason})}</div>;
    if (item.kind === 'error') return <div className="rounded-lg border border-red-500/20 bg-red-500/8 px-2.5 py-2 text-xs text-red-600 dark:text-red-400">{item.text}</div>;
    if (item.kind === 'user') return (
        <div className="flex min-w-0 justify-end">
            <div className="ai-message-user-wrap group/message relative min-w-0 max-w-[88%]">
                <div className={`min-w-0 whitespace-pre-wrap break-words rounded-2xl rounded-br-md border px-3.5 py-2.5 shadow-sm ${item.status === 'queued' ? 'border-dashed border-blue-500/40 bg-blue-500/10' : item.status === 'failed' ? 'border-red-500/30 bg-red-500/10' : 'ai-message-user'}`}>
                    {item.text}
                    {item.status ? (
                        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-medium text-gray-500">
                            <span>{t(item.status === 'failed' ? 'ai_assistant.failed' : 'ai_assistant.queued')}</span>
                            {item.status === 'queued' ? <Button size="small" onClick={() => onSendNow(item)}>{t('ai_assistant.send_now')}</Button> : <Button size="small" disabled={actionsDisabled} onClick={() => onRetry(item)}>{t('actions.retry')}</Button>}
                        </div>
                    ) : null}
                </div>
                <MessageActionsBar onCopy={() => onCopy(item.text)}>
                    {!item.status && item.persisted ? <Tooltip title={t('actions.edit')}><button type="button" aria-label={t('actions.edit')} disabled={actionsDisabled} className="ai-message-action" onClick={() => onEdit(item)}><PencilIcon className="h-3.5 w-3.5"/></button></Tooltip> : null}
                </MessageActionsBar>
            </div>
        </div>
    );
    return (
        <div className="group/message relative w-full min-w-0">
            <div className={`w-full min-w-0 break-words ${inProcess ? 'text-gray-500 dark:text-gray-400' : 'ai-message-assistant rounded-xl rounded-tl-sm border px-3 py-2.5'}`}>
                {item.reasoning ? <ReasoningContent expandedStates={expanded} itemId={item.id} text={item.reasoning} streaming={item.streaming && Boolean(item.reasoningStreaming)} onCopy={onCopy}/> : null}
                {item.text ? <AIMessageMarkdown text={item.text}/> : null}
                {item.streaming && item.text ? <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-current align-middle opacity-60"/> : null}
            </div>
            {!inProcess ? <MessageActionsBar onCopy={() => onCopy(item.text || item.reasoning)}/> : null}
        </div>
    );
};

const MessageActionsBar = ({onCopy, children}: {onCopy: () => void; children?: React.ReactNode}) => {
    const {t} = useTranslation();
    return <div className="ai-message-actions absolute -bottom-2 right-2 z-10 flex translate-y-1/2 items-center gap-0.5 rounded-md border p-0.5 shadow-sm">
        <Tooltip title={t('actions.copy')}><button type="button" aria-label={t('actions.copy')} className="ai-message-action" onClick={onCopy}><CopyIcon className="h-3 w-3"/></button></Tooltip>
        {children}
    </div>;
};

const toolTypeIcons = {
    terminal_execute: TerminalIcon,
    shell_io: TerminalIcon,
    file_read: FileTextIcon,
    file_write: FilePenLineIcon,
    file_edit: FilePenLineIcon,
    web_fetch: GlobeIcon,
    search_hosts: SearchIcon,
    conversation_compact: ChevronsDownUpIcon,
    command_snippet_read: BookOpenIcon,
};
const toolStringArg = (args: Record<string, unknown>, name: string): string => typeof args[name] === 'string' ? args[name] as string : '';
const hostBadgeColors = [
    'border-blue-500/30 border-l-blue-500 bg-blue-500/8',
    'border-emerald-500/30 border-l-emerald-500 bg-emerald-500/8',
    'border-violet-500/30 border-l-violet-500 bg-violet-500/8',
    'border-amber-500/30 border-l-amber-500 bg-amber-500/8',
    'border-rose-500/30 border-l-rose-500 bg-rose-500/8',
    'border-cyan-500/30 border-l-cyan-500 bg-cyan-500/8',
];

const ToolItem = ({execution, onCopy, expandedStates, itemId, hostColorIndex, showHostInfo}: {execution: AIToolExecution; onCopy: (text: string) => void; expandedStates: Map<string, boolean>; itemId: string; hostColorIndex: number; showHostInfo: boolean}) => {
    const {t} = useTranslation();
    const args = execution.arguments || {};
    const failed = ['failed', 'rejected', 'timed_out'].includes(execution.state);
    const active = ['reviewing', 'running'].includes(execution.state);
    const pending = ['awaiting_approval', 'needs_revision'].includes(execution.state);
    const toolName = t(`ai_assistant.tool_names.${execution.name}`, {defaultValue: execution.name});
    const command = toolStringArg(args, 'command');
    const path = toolStringArg(args, 'path');
    const explanation = toolStringArg(args, 'explanation');
    const hostName = showHostInfo ? toolStringArg(args, 'hostName') || toolStringArg(args, 'hostId') : '';
    const label = formatToolExecution(execution);
    const detail = command || path || toolStringArg(args, 'url') || toolStringArg(args, 'keyword') || toolStringArg(args, 'snippetId');
    const content = execution.name === 'file_write' ? toolStringArg(args, 'content') : '';
    const result = execution.result;
    const compactWithoutOutput = execution.name === 'conversation_compact' && !result?.output?.trim();
    const [expanded, toggleExpanded] = useMessageExpanded(expandedStates, itemId, false);
    const Icon = toolTypeIcons[execution.name as keyof typeof toolTypeIcons] || WrenchIcon;
    const icon = active ? <CircleDashedIcon className="h-3.5 w-3.5 animate-spin"/> : pending ? <AlertTriangleIcon className="h-3.5 w-3.5"/> : failed ? <XCircleIcon className="h-3.5 w-3.5"/> : execution.state === 'succeeded' ? <CheckCircle2Icon className="h-3.5 w-3.5"/> : <TerminalIcon className="h-3.5 w-3.5"/>;
    const statusColor = execution.state === 'reviewing' ? 'text-blue-600 dark:text-blue-400'
        : pending ? 'text-amber-700 dark:text-amber-300'
            : failed ? 'text-red-600 dark:text-red-400'
                : execution.state === 'succeeded' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400';
    const canExpand = Boolean(detail || explanation || content || (result && !compactWithoutOutput) || execution.fileDiff || execution.approvalReview);
    return (
        <div className="ai-message-tool min-w-0 overflow-hidden rounded-lg border">
            <button type="button" aria-expanded={canExpand ? expanded : undefined} aria-disabled={!canExpand} aria-label={label || toolName} title={[hostName, label].filter(Boolean).join('\n') || undefined} className="ai-message-tool-trigger flex w-full min-w-0 items-center gap-2 px-2.5 py-1.5 text-left text-xs outline-none aria-disabled:cursor-default focus-visible:ring-2 focus-visible:ring-blue-500/30" onClick={canExpand ? toggleExpanded : undefined}>
                {hostName ? <span className={`inline-flex max-w-[35%] shrink-0 items-center gap-1.5 rounded border border-l-2 px-1.5 py-0.5 text-[10px] font-medium leading-none ${hostBadgeColors[hostColorIndex % hostBadgeColors.length]}`}><ServerIcon className="h-3 w-3 shrink-0"/><span className="truncate">{hostName}</span></span> : null}
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    <Tooltip title={toolName}><span className="inline-flex shrink-0 text-gray-500 dark:text-gray-400" aria-label={toolName}><Icon className="h-3.5 w-3.5"/></span></Tooltip>
                    <span className="min-w-0 truncate font-mono">{label}</span>
                </span>
                <Tooltip title={t(`ai_assistant.tool_state_${execution.state}`)}><span className={`inline-flex shrink-0 ${statusColor}`} aria-label={t(`ai_assistant.tool_state_${execution.state}`)}>{icon}</span></Tooltip>
                {result && !compactWithoutOutput ? <span className="shrink-0 tabular-nums text-gray-500 dark:text-gray-400">{result.durationMs}ms</span> : null}
                {canExpand ? expanded ? <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-gray-500"/> : <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-gray-500"/> : null}
            </button>
            {canExpand && expanded ? (
                <div className="ai-message-tool-content space-y-2 border-t px-2.5 py-2.5">
                    {execution.approvalReview ? <div className="rounded-md border border-blue-500/20 bg-blue-500/5 px-2 py-1.5 text-xs">
                        <div className="flex items-center gap-1.5 font-medium"><BotIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400"/>{t('ai_assistant.approval_review')}{execution.approvalReview.riskLevel ? <span className="text-[10px] font-normal text-gray-500">{execution.approvalReview.riskLevel}</span> : null}</div>
                        {execution.approvalReview.rationale ? <div className="mt-1 whitespace-pre-wrap break-words leading-relaxed text-gray-500 dark:text-gray-400">{execution.approvalReview.rationale}</div> : null}
                    </div> : null}
                    {detail ? <ToolTextBlock title={t(path ? 'ai_assistant.file_path' : command ? 'ai_assistant.full_command' : 'ai_assistant.tool_arguments')} text={detail} onCopy={() => onCopy(detail)}/> : null}
                    {explanation ? <ToolTextBlock title={t('ai_assistant.command_explanation')} text={explanation} onCopy={() => onCopy(explanation)}/> : null}
                    {execution.fileDiff ? <ToolTextBlock title={t('ai_assistant.file_changes')} text={formatFileDiff(execution)} onCopy={() => onCopy(formatFileDiff(execution))}/> : content ? <ToolTextBlock title={t('ai_assistant.file_content')} text={content} onCopy={() => onCopy(content)}/> : null}
                    {result && !compactWithoutOutput ? <ToolTextBlock title={t('ai_assistant.tool_output')} text={result.output || t('ai_assistant.no_output')} muted={!result.output} onCopy={() => onCopy(result.output)}/> : null}
                </div>
            ) : null}
        </div>
    );
};

const LoadingBubble = ({items}: {items: ChatItem[]}) => {
    const {t} = useTranslation();
    const last = items[items.length - 1];
    if (last?.kind === 'assistant' && last.streaming) return null;
    const label = last?.kind === 'tool' ? t('ai_assistant.running_tool') : last?.kind === 'user' ? t('ai_assistant.thinking') : t('ai_assistant.generating');
    return <div className="flex h-7 items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400" role="status"><LoaderCircleIcon className="h-3.5 w-3.5 shrink-0 animate-spin"/><span>{label}</span></div>;
};

const ReasoningContent = ({text, streaming, onCopy, expandedStates, itemId}: {text: string; streaming: boolean; onCopy: (text: string) => void; expandedStates: Map<string, boolean>; itemId: string}) => {
    const {t} = useTranslation();
    const [expanded, toggleExpanded] = useMessageExpanded(expandedStates, itemId, streaming);
    return <div className="ai-message-reasoning mb-2 w-full min-w-0 overflow-hidden rounded-md border">
        <button type="button" aria-expanded={expanded} className="flex w-full min-w-0 items-center gap-1.5 px-2 py-1.5 text-left text-xs text-gray-500 outline-none hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" onClick={toggleExpanded}>
            <BrainIcon className="h-3.5 w-3.5 shrink-0"/><span className="min-w-0 flex-1 truncate font-medium">{t('ai_assistant.reasoning')}</span>
            {streaming ? <CircleDashedIcon className="h-3.5 w-3.5 shrink-0 animate-spin"/> : null}
            {expanded ? <ChevronDownIcon className="h-3.5 w-3.5 shrink-0"/> : <ChevronRightIcon className="h-3.5 w-3.5 shrink-0"/>}
        </button>
        {expanded ? <div className="border-t border-gray-200/70 dark:border-white/10">
            <pre className="max-h-56 w-full min-w-0 overflow-auto whitespace-pre-wrap [overflow-wrap:anywhere] px-2 pt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{text}</pre>
            <div className="flex justify-end px-2 py-1"><Tooltip title={t('actions.copy')}><button type="button" aria-label={t('actions.copy')} className="ai-message-action" onClick={() => onCopy(text)}><CopyIcon className="h-3.5 w-3.5"/></button></Tooltip></div>
        </div> : null}
    </div>;
};

const ToolTextBlock = ({title, text, muted, onCopy}: {title: string; text: string; muted?: boolean; onCopy: () => void}) => {
    const {t} = useTranslation();
    return <div className="min-w-0"><div className="mb-1 flex items-center justify-between gap-2"><span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{title}</span><Tooltip title={t('actions.copy')}><button type="button" aria-label={t('actions.copy')} className="ai-message-action shrink-0" onClick={onCopy}><CopyIcon className="h-3.5 w-3.5"/></button></Tooltip></div><pre className={`ai-message-tool-output max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg border px-2.5 py-2 font-mono text-xs leading-relaxed ${muted ? 'text-gray-500 dark:text-gray-400' : ''}`}>{text}</pre></div>;
};

const HistoryModal = ({open, search, conversations, currentId, loading, loadingId, deletingId, clearing, hasConversations, onClose, onSearch, onLoad, onDelete, onClear}: {open: boolean; search: string; conversations: AIConversation[]; currentId: string; loading: boolean; loadingId: string; deletingId: string; clearing: boolean; hasConversations: boolean; onClose: () => void; onSearch: (value: string) => void; onLoad: (item: AIConversation) => void; onDelete: (id: string) => void; onClear: () => void}) => {
    const {t} = useTranslation();
    return <Modal title={t('ai_assistant.history')} open={open} footer={null} width={620} destroyOnHidden onCancel={onClose}><div className="mb-3 flex items-center gap-2"><Input.Search allowClear value={search} placeholder={t('ai_assistant.history_search')} onChange={event => onSearch(event.target.value)}/><Popconfirm title={t('ai_assistant.clear_confirm')} onConfirm={onClear}><Button danger loading={clearing} disabled={!hasConversations} icon={<Trash2Icon className="h-4 w-4"/>}>{t('actions.clear')}</Button></Popconfirm></div><div className="ai-assistant max-h-[55vh] overflow-y-auto">{loading ? <div className="flex justify-center py-8"><Spin/></div> : conversations.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('ai_assistant.no_history')}/> : conversations.map(item => <div key={item.id} className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-2 py-3 last:border-b-0 dark:border-white/10" onClick={() => onLoad(item)}><div className="min-w-0 flex-1"><Typography.Text ellipsis className={item.id === currentId ? 'text-blue-500' : undefined}>{item.title || t('ai_assistant.new_chat')}</Typography.Text><div className="text-xs text-gray-500">{new Date(item.updatedAt).toLocaleString(i18n.resolvedLanguage || i18n.language)}</div></div>{loadingId === item.id ? <Spin size="small"/> : null}<Popconfirm title={t('ai_assistant.delete_confirm')} onConfirm={() => onDelete(item.id)}><Button danger type="text" size="small" loading={deletingId === item.id} icon={<Trash2Icon className="h-4 w-4"/>} onClick={event => event.stopPropagation()}/></Popconfirm></div>)}</div></Modal>;
};

const itemsFromHistory = (messages: AIMessage[]): ChatItem[] => messages.flatMap((message): ChatItem[] => {
    if (message.role === 'user') return [{id: message.id, kind: 'user', text: message.content || '', persisted: true}];
    if (message.role === 'assistant') return [{id: message.id, kind: 'assistant', text: message.content || '', reasoning: message.reasoningContent || '', streaming: false}];
    if (message.role === 'tool' && message.toolExecution) return [{id: message.id, kind: 'tool', execution: message.toolExecution}];
    if (message.role === 'error') return [{id: message.id, kind: 'error', text: message.content || ''}];
    if (message.role === 'tool_call' && message.toolCall) return [{id: message.id, kind: 'tool', execution: {executionId: message.toolCall.callId, name: message.toolCall.name, arguments: message.toolCall.arguments, state: 'succeeded'}}];
    return [];
});

const usageFromConversation = (conversation: AIConversation): Usage | null => conversation.usage ? {
    prompt: conversation.usage.promptTokens || 0,
    completion: conversation.usage.completionTokens || 0,
    total: conversation.usage.totalTokens || 0,
    estimated: conversation.usage.context?.estimated,
    context: conversation.usage.context,
    cache: conversation.usage.cache,
} : null;

const formatToolExecution = (execution: AIToolExecution) => {
    const args = execution.arguments || {};
    const detail = args.command || args.path || args.url || args.keyword || args.snippetId;
    if (typeof detail === 'string' && detail) return detail;
    return [toolStringArg(args, 'action'), toolStringArg(args, 'input')].filter(Boolean).join(' · ');
};

const formatFileDiff = (execution: AIToolExecution) => {
    const diff = execution.fileDiff;
    if (!diff) return '';
    return `--- ${diff.fileExisted ? 'original' : '/dev/null'}\n+++ modified\n\n${diff.modifiedContent || ''}`;
};

export default AIAssistant;
