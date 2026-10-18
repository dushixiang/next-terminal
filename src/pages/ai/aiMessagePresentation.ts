import type {ChatItem} from './AIAssistant';
import type {AIDisplayLevel} from '@/api/ai-preferences-api';

export type ProcessStatus = 'running' | 'approval' | 'completed' | 'stopped' | 'failed';
export interface AIProcessRow {
    id: string;
    kind: 'process';
    items: ChatItem[];
    status: ProcessStatus;
    toolCount: number;
}
export type AIMessageRow = ChatItem | AIProcessRow;

// 只有已接收的用户消息划分轮次，排队消息不会截断当前执行过程。
export function buildAIMessageRows(items: ChatItem[], level: AIDisplayLevel, busy: boolean): AIMessageRow[] {
    if (level === 'detailed') return items;
    const rows: AIMessageRow[] = [];
    const pending = items.filter(item => item.kind === 'user' && item.status);
    let process: ChatItem[] = [];
    let anchor = 'initial';
    const flush = (active = false) => {
        if (!process.length) return;
        const last = process[process.length - 1];
        const answer = !active && last?.kind === 'assistant' && last.text.trim() ? last : undefined;
        const content = answer ? process.slice(0, -1) : [...process];
        if (answer?.reasoning.trim()) content.push({...answer, id: `${answer.id}:reasoning`, text: ''});
        const tools = content.filter(item => item.kind === 'tool');
        const failed = process.some(item => item.kind === 'error') || tools.some(item => ['failed', 'timed_out', 'needs_revision'].includes(item.execution.state));
        const status: ProcessStatus = failed ? 'failed'
            : tools.some(item => item.execution.state === 'awaiting_approval') ? 'approval'
                : active ? 'running' : answer ? 'completed' : 'stopped';
        const entries = content.filter(item => item.kind !== 'error');
        if (entries.length) rows.push({id: `process:${anchor}`, kind: 'process', items: entries, status, toolCount: tools.length});
        rows.push(...content.filter(item => item.kind === 'error'));
        if (answer) rows.push({...answer, reasoning: '', reasoningStreaming: false});
        process = [];
    };
    for (const item of items) {
        if (item.kind === 'user') {
            if (item.status) continue;
            flush();
            rows.push(item);
            anchor = item.clientMessageId || item.id;
        } else process.push(item);
    }
    flush(busy);
    rows.push(...pending);
    return rows;
}
