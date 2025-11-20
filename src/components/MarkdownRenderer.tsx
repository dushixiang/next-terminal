import React, { useMemo } from 'react';
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
    text: string;
    isMobile?: boolean;
}

/**
 * 轻量级 Markdown 渲染器组件
 * 支持: 标题、列表、代码块、引用、粗体、斜体、行内代码
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ text, isMobile = false }) => {
    
    // 处理行内标记（加粗、斜体、代码）
    const processInlineElements = useMemo(() => {
        return (text: string): React.ReactNode[] => {
            const parts: React.ReactNode[] = [];
            let remaining = text;
            let partIndex = 0;
            
            while (remaining.length > 0) {
                // 查找下一个标记的位置
                const boldMatch = remaining.match(/\*\*(.*?)\*\*|__(.*?)__/);
                const italicMatch = remaining.match(/\*(.*?)\*|_(.*?)_/);
                const codeMatch = remaining.match(/`(.*?)`/);
                
                const matches = [
                    boldMatch ? { match: boldMatch, type: 'bold', start: boldMatch.index! } : null,
                    italicMatch ? { match: italicMatch, type: 'italic', start: italicMatch.index! } : null,
                    codeMatch ? { match: codeMatch, type: 'code', start: codeMatch.index! } : null,
                ].filter(Boolean).sort((a, b) => a!.start - b!.start);
                
                if (matches.length === 0) {
                    // 没有更多标记，添加剩余文本
                    if (remaining.trim()) {
                        parts.push(<span key={partIndex++}>{remaining}</span>);
                    }
                    break;
                }
                
                const nextMatch = matches[0]!;
                
                // 添加标记前的文本
                if (nextMatch.start > 0) {
                    const beforeText = remaining.substring(0, nextMatch.start);
                    if (beforeText.trim()) {
                        parts.push(<span key={partIndex++}>{beforeText}</span>);
                    }
                }
                
                // 添加标记内容
                const matchedText = nextMatch.match[1] || nextMatch.match[2] || '';
                switch (nextMatch.type) {
                    case 'bold':
                        parts.push(<strong key={partIndex++} className="font-bold">{matchedText}</strong>);
                        break;
                    case 'italic':
                        parts.push(<em key={partIndex++} className="italic">{matchedText}</em>);
                        break;
                    case 'code':
                        parts.push(
                            <code key={partIndex++} className={cn(
                                'bg-gray-100 dark:bg-gray-800 px-1 rounded',
                                isMobile ? 'text-xs' : 'text-sm'
                            )}>
                                {matchedText}
                            </code>
                        );
                        break;
                }
                
                // 更新剩余文本
                remaining = remaining.substring(nextMatch.start + nextMatch.match[0].length);
            }
            
            return parts.length > 0 ? parts : [text];
        };
    }, [isMobile]);
    
    const elements = useMemo(() => {
        if (!text) return null;
        
        const lines = text.split('\n');
        const result: React.ReactNode[] = [];
        let currentList: { type: 'ul' | 'ol', items: React.ReactNode[] } | null = null;
        let codeBlockStart = -1;
        
        const flushList = () => {
            if (currentList) {
                const ListTag = currentList.type;
                result.push(
                    <ListTag key={result.length} className={cn(
                        currentList.type === 'ul' ? 'list-disc list-inside mb-3 ml-4' : 'list-decimal list-inside mb-3 ml-4',
                        isMobile ? 'text-xs' : 'text-sm'
                    )}>
                        {currentList.items.map((item, idx) => (
                            <li key={idx} className="mb-1">{item}</li>
                        ))}
                    </ListTag>
                );
                currentList = null;
            }
        };
        
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            // 处理代码块的结束
            if (codeBlockStart >= 0 && trimmed === '```') {
                const codeLines = lines.slice(codeBlockStart + 1, index);
                if (codeLines.length > 0) {
                    result.push(
                        <pre key={codeBlockStart} className={cn(
                            'bg-gray-100 dark:bg-gray-800 p-3 rounded mb-3 overflow-x-auto',
                            isMobile ? 'text-xs' : 'text-sm'
                        )}>
                            <code>{codeLines.join('\n')}</code>
                        </pre>
                    );
                }
                codeBlockStart = -1;
                return;
            }
            
            // 如果在代码块内，跳过处理
            if (codeBlockStart >= 0) {
                return;
            }
            
            // 空行
            if (!trimmed) {
                flushList();
                return;
            }
            
            // 代码块开始
            if (trimmed.startsWith('```')) {
                flushList();
                codeBlockStart = index;
                return;
            }
            
            // 标题 # ## ###
            if (trimmed.startsWith('#')) {
                flushList();
                const level = trimmed.match(/^#+/)?.[0].length || 1;
                const text = trimmed.replace(/^#+\s*/, '');
                const content = processInlineElements(text);
                
                if (level === 1) {
                    result.push(
                        <h1 key={index} className={cn(
                            'font-bold mb-3 mt-4 first:mt-0',
                            isMobile ? 'text-base' : 'text-xl'
                        )}>
                            {content}
                        </h1>
                    );
                } else if (level === 2) {
                    result.push(
                        <h2 key={index} className={cn(
                            'font-bold mb-2 mt-3 first:mt-0',
                            isMobile ? 'text-sm' : 'text-lg'
                        )}>
                            {content}
                        </h2>
                    );
                } else {
                    result.push(
                        <h3 key={index} className={cn(
                            'font-bold mb-2 mt-3 first:mt-0',
                            isMobile ? 'text-sm' : 'text-base'
                        )}>
                            {content}
                        </h3>
                    );
                }
                return;
            }
            
            // 无序列表 - * +
            if (/^[-*+]\s/.test(trimmed)) {
                const text = trimmed.replace(/^[-*+]\s/, '');
                const content = processInlineElements(text);
                if (!currentList || currentList.type !== 'ul') {
                    flushList();
                    currentList = { type: 'ul', items: [] };
                }
                currentList.items.push(<span key={currentList.items.length}>{content}</span>);
                return;
            }
            
            // 有序列表 1. 2. 3.
            if (/^\d+\.\s/.test(trimmed)) {
                const text = trimmed.replace(/^\d+\.\s/, '');
                const content = processInlineElements(text);
                if (!currentList || currentList.type !== 'ol') {
                    flushList();
                    currentList = { type: 'ol', items: [] };
                }
                currentList.items.push(<span key={currentList.items.length}>{content}</span>);
                return;
            }
            
            // 引用 >
            if (trimmed.startsWith('>')) {
                flushList();
                const text = trimmed.replace(/^>\s*/, '');
                const content = processInlineElements(text);
                result.push(
                    <blockquote key={index} className={cn(
                        'border-l-4 border-gray-300 pl-4 italic mb-3',
                        isMobile ? 'text-xs' : 'text-sm'
                    )}>
                        {content}
                    </blockquote>
                );
                return;
            }
            
            // 普通段落
            flushList();
            const content = processInlineElements(trimmed);
            result.push(
                <p key={index} className={cn(
                    'mb-2 leading-relaxed',
                    isMobile ? 'text-xs' : 'text-sm'
                )}>
                    {content}
                </p>
            );
        });
        
        flushList(); // 处理最后的列表
        
        return result;
    }, [text, isMobile, processInlineElements]);
    
    return <div className="markdown-content">{elements}</div>;
};

