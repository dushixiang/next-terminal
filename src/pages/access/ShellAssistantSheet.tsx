import React, {useEffect, useState} from 'react';
import {Button, Checkbox, Drawer, Input} from 'antd';
import {CirclePlay, RotateCcw, Send} from 'lucide-react';
import {useTranslation} from "react-i18next";
import {useWindowSize} from 'react-use';
import {ScrollArea} from "@/components/ui/scroll-area";
import shellAssistantApi, {StreamResponse} from "@/api/shell-assistant-api";
import accessSettingApi from "@/api/access-setting-api";

const {TextArea} = Input;

interface Props {
    open: boolean
    onClose: () => void
    onExecute: (content: string) => void
    placement?: 'top' | 'right' | 'bottom' | 'left'
    mask?: boolean
    maskClosable?: boolean
}

interface StreamingResponse {
    id: string;
    question: string;
    content: string;
    isComplete: boolean;
    success: boolean;
    error?: string;
}

const ShellAssistantSheet = ({open, onClose, onExecute, placement, mask, maskClosable}: Props) => {
    const {t} = useTranslation();
    const {height} = useWindowSize();
    const [question, setQuestion] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [useSnippets, setUseSnippets] = useState<boolean>(true);
    const [responses, setResponses] = useState<StreamingResponse[]>([]);

    // 从后端加载 useSnippets 设置
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const setting = await accessSettingApi.get();
                // 如果后端没有设置，默认为 true
                setUseSnippets(setting.useSnippets !== undefined ? setting.useSnippets : true);
            } catch (error) {
                console.error('Failed to load access settings:', error);
                // 出错时使用默认值 true
                setUseSnippets(true);
            }
        };
        loadSettings();
    }, []);

    // 清理markdown代码块格式
    const cleanMarkdownCode = (content: string): string => {
        if (!content) return content;
        
        // 移除代码块标记，支持多种格式
        return content
            .replace(/^```(?:bash|shell|sh|zsh|fish|cmd|powershell|ps1)?\s*\n?/gim, '') // 开始标记
            .replace(/\n?```\s*$/gim, '') // 结束标记
            .replace(/^`([^`\n]+)`$/gm, '$1') // 单行代码标记
            .trim();
    };

    if (!placement) {
        placement = 'right';
    }

    const handleAsk = async () => {
        if (!question.trim()) {
            return;
        }

        setLoading(true);
        const responseId = Date.now().toString();
        const currentQuestion = question;

        // 创建新的响应对象
        const newResponse: StreamingResponse = {
            id: responseId,
            question: currentQuestion,
            content: '',
            isComplete: false,
            success: true,
        };

        setResponses(prev => [newResponse, ...prev]);
        setQuestion('');

        try {
            await shellAssistantApi.askStream(
                {question: currentQuestion, useSnippets: useSnippets},
                (streamResponse: StreamResponse) => {
                    if (!streamResponse.success) {
                        // 处理错误
                        setResponses(prev =>
                            prev.map(r =>
                                r.id === responseId
                                    ? {...r, success: false, error: streamResponse.error, isComplete: true}
                                    : r
                            )
                        );
                        return;
                    }

                    switch (streamResponse.type) {
                        case 'start':
                            // 流式开始，无需特殊处理
                            break;
                        case 'content':
                            // 更新内容
                            setResponses(prev =>
                                prev.map(r =>
                                    r.id === responseId
                                        ? {...r, content: r.content + (streamResponse.content || '')}
                                        : r
                                )
                            );
                            break;
                        case 'end':
                            // 流式结束，进行最终内容清理
                            setResponses(prev =>
                                prev.map(r => {
                                    if (r.id === responseId) {
                                        const cleanedContent = cleanMarkdownCode(r.content);
                                        return {...r, content: cleanedContent, isComplete: true};
                                    }
                                    return r;
                                })
                            );
                            break;
                    }
                },
                (error: Error) => {
                    console.error('Shell assistant request failed:', error);
                    setResponses(prev =>
                        prev.map(r =>
                            r.id === responseId
                                ? {...r, success: false, error: t('access.shell_assistant.request_failed_retry'), isComplete: true}
                                : r
                        )
                    );
                }
            );
        } catch (error) {
            console.error('Shell assistant request failed:', error);
            setResponses(prev =>
                prev.map(r =>
                    r.id === responseId
                        ? {...r, success: false, error: t('access.shell_assistant.request_failed_retry'), isComplete: true}
                        : r
                )
            );
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setResponses([]);
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // 检查是否为真正的Enter键（避免输入法影响）
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            if (e.shiftKey) {
                // Shift + Enter 允许换行，不做任何处理
                return;
            } else {
                // 单独 Enter 提交
                e.preventDefault();
                handleAsk();
            }
        }
    };

    return (
        <Drawer
            title={<span className="text-gray-100">{t('access.shell_assistant.title')}</span>}
            placement={placement}
            onClose={onClose}
            open={open}
            mask={mask}
            maskClosable={maskClosable}
            push={false}
            className="bg-[#1F1F1F]"
            styles={{
                header: {
                    backgroundColor: '#1F1F1F',
                    borderBottom: '1px solid #333'
                },
                body: {
                    backgroundColor: '#1F1F1F'
                }
            }}
            extra={
                <Button
                    type="link"
                    icon={<RotateCcw className="h-4 w-4"/>}
                    onClick={handleClear}
                    disabled={responses.length === 0}
                    className="text-gray-300 hover:text-white"
                >
                    {t('actions.clear')}
                </Button>
            }
            getContainer={false}
        >
            <div className="flex flex-col gap-4">
                {/* 输入区域 */}
                <div>
                    <TextArea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder={t('access.shell_assistant.placeholder')}
                        rows={3}
                        disabled={loading}
                        className="bg-gray-800 border-gray-600 text-gray-100"
                        style={{
                            resize: 'vertical',
                            maxHeight: '200px'
                        }}
                        autoSize={{ minRows: 3, maxRows: 8 }}
                    />
                    <div className="flex justify-between items-center mt-2">
                        <div className="flex flex-col gap-1">
                            <Checkbox
                                checked={useSnippets}
                                onChange={async (e) => {
                                    const newValue = e.target.checked;
                                    setUseSnippets(newValue);
                                    // 保存到后端
                                    try {
                                        await accessSettingApi.set({
                                            useSnippets: String(newValue)
                                        });
                                    } catch (error) {
                                        console.error('Failed to save useSnippets setting:', error);
                                    }
                                }}
                                className="text-gray-300"
                            >
                                <span className="text-gray-300">{t('access.shell_assistant.use_snippets')}</span>
                            </Checkbox>
                            <span className="text-xs text-gray-500">
                                {t('access.shell_assistant.shortcut_tip')}
                            </span>
                        </div>
                        <Button
                            type="primary"
                            onClick={handleAsk}
                            loading={loading}
                            disabled={!question.trim()}
                        >
                            <Send className="h-4 w-4"/>
                            {t('access.shell_assistant.ask')}
                        </Button>
                    </div>
                </div>

                {/* 响应列表 */}
                {responses.length > 0 && (
                    <ScrollArea style={{height: height - 400}}>
                        <div className="space-y-4 pr-3">
                            {responses.map((response) => (
                                <div key={response.id} className="space-y-2">
                                    {response.success ? (
                                        <>
                                            {/* 问题 */}
                                            <div className="flex items-start gap-2">
                                                <div
                                                    className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                                                    Q
                                                </div>
                                                <div className="text-sm text-gray-300 leading-relaxed">
                                                    {response.question}
                                                </div>
                                            </div>

                                            {/* 回答 */}
                                            <div className="flex items-start gap-2">
                                                <div
                                                    className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                                                    A
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div
                                                        className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="text-xs text-gray-400">{t('access.shell_assistant.command_label')}</span>
                                                            {response.isComplete && response.content && (
                                                                <CirclePlay
                                                                    className="h-4 w-4 text-green-400 hover:text-green-300 cursor-pointer"
                                                                    onClick={() => onExecute(response.content)}
                                                                />
                                                            )}
                                                        </div>
                                                        <pre
                                                            className="font-mono text-xs text-gray-100 m-0 bg-gray-900/50 p-2 rounded border border-gray-600/30 overflow-x-auto max-w-full custom-scrollbar"
                                                            style={{
                                                                whiteSpace: 'pre-wrap',
                                                                wordWrap: 'break-word',
                                                                overflowWrap: 'break-word',
                                                                wordBreak: 'break-all',
                                                                hyphens: 'auto',
                                                                maxHeight: '300px',
                                                                overflowY: 'auto',
                                                                // Firefox滚动条样式
                                                                scrollbarWidth: 'thin',
                                                                scrollbarColor: '#4B5563 transparent'
                                                            }}>
                                                    {response.content}
                                                            {!response.isComplete &&
                                                                <span className="text-green-400">▋</span>}
                                                </pre>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        /* 错误状态 */
                                        <div className="flex items-start gap-2">
                                            <div
                                                className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                                                !
                                            </div>
                                            <div className="flex-1">
                                                <div className="bg-red-900/10 border border-red-800/30 rounded-lg p-3">
                                                    <div className="text-red-400 text-sm font-medium mb-1">{t('access.shell_assistant.request_failed')}</div>
                                                    <div 
                                                        className="text-red-300 text-sm"
                                                        style={{
                                                            wordWrap: 'break-word',
                                                            overflowWrap: 'break-word',
                                                            wordBreak: 'break-all'
                                                        }}
                                                    >
                                                        {response.error}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}

                {responses.length === 0 && !loading && (
                    <div className="text-center py-8 text-gray-400">
                        <div className="text-2xl mb-2">🤖</div>
                        <div className="text-gray-300">{t('access.shell_assistant.ready_title')}</div>
                        <div className="text-xs mt-1 text-gray-500">{t('access.shell_assistant.ready_subtitle')}</div>
                    </div>
                )}
            </div>
        </Drawer>
    );
};

export default ShellAssistantSheet;
