import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildAIMessageRows} from '../src/pages/ai/aiMessagePresentation.ts';

const user = {id: 'u1', kind: 'user', text: '检查服务'};
const tool = {id: 't1', kind: 'tool', execution: {name: 'terminal_execute', state: 'succeeded'}};
const answer = {id: 'a1', kind: 'assistant', text: '服务正常', reasoning: '检查结果', streaming: false};

test('完成后拆出最终回答，思考与工具仍可在过程内查看', () => {
    const rows = buildAIMessageRows([user, tool, answer], 'standard', false);
    assert.deepEqual(rows.map(row => row.kind), ['user', 'process', 'assistant']);
    assert.equal(rows[1].status, 'completed');
    assert.equal(rows[1].items[1].reasoning, answer.reasoning);
    assert.equal(rows[1].items[1].text, '');
    assert.equal(rows[2].reasoning, '');
    assert.equal(answer.reasoning, '检查结果');
});

test('排队消息不会截断正在执行的轮次', () => {
    const queued = {...user, id: 'u2', status: 'queued'};
    const rows = buildAIMessageRows([user, tool, queued, answer], 'compact', true);
    assert.deepEqual(rows.map(row => row.kind), ['user', 'process', 'user']);
    assert.equal(rows[1].status, 'running');
    assert.equal(rows[1].items.length, 2);
    assert.equal(rows[2].status, 'queued');
});

test('错误单独展示，待审批与停止状态保留', () => {
    for (const [state, expected] of [['awaiting_approval', 'approval'], ['cancelled', 'stopped'], ['failed', 'failed']]) {
        const rows = buildAIMessageRows([user, {...tool, execution: {...tool.execution, state}}], 'standard', state === 'awaiting_approval');
        assert.equal(rows[1].status, expected);
    }
    const rows = buildAIMessageRows([user, tool, {id: 'e1', kind: 'error', text: '网络异常'}], 'compact', false);
    assert.equal(rows[1].status, 'failed');
    assert.equal(rows[2].kind, 'error');
});

test('已接收的新消息开始新轮次；详细模式保留原始消息', () => {
    const items = [user, tool, answer, {...user, id: 'u2'}, {...tool, id: 't2'}];
    const rows = buildAIMessageRows(items, 'standard', true);
    assert.deepEqual(rows.map(row => row.kind), ['user', 'process', 'assistant', 'user', 'process']);
    assert.equal(rows[1].status, 'completed');
    assert.equal(rows[4].status, 'running');
    assert.equal(buildAIMessageRows(items, 'detailed', true), items);
});
