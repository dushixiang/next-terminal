import React, {useEffect, useState} from 'react';
import {App, Button, Typography} from "antd";
import {useTranslation} from "react-i18next";
import {useMutation, useQuery} from "@tanstack/react-query";
import brandingApi from "@/src/api/branding-api";
import propertyApi from "@/src/api/property-api";
import {LoadingOutlined} from "@ant-design/icons";
import strings from "@/src/utils/strings";
import SimpleBar from "simplebar-react";
import {useLicense} from "@/src/hook/use-license";
import {useMobile} from "@/src/hook/use-mobile";
import {cn} from "@/lib/utils";
const {Title} = Typography;

const About = () => {

    const { isMobile } = useMobile();
    const {t} = useTranslation();

    let {modal} = App.useApp();

    let [canUpgrade, setCanUpgrade] = useState(false);
    let [license] = useLicense();

    let brandingQuery = useQuery({
        queryKey: ['branding'],
        queryFn: brandingApi.getBranding,
    });

    let versionQuery = useQuery({
        queryKey: ['version'],
        queryFn: propertyApi.getLatestVersion,
    });

    let upgradeStatus = useQuery({
        queryKey: ['upgradeStatus'],
        queryFn: propertyApi.upgradeStatus,
        refetchInterval: 1000,
    });

    useEffect(() => {
        switch (upgradeStatus.data?.status) {
            case "idle":
                break;
            case "running":
                break;
            case "failed":
                modal.error({
                    title: t('settings.about.upgrade.failed'),
                    content: upgradeStatus.data?.message,
                })
                break;
            case "success":
                modal.success({
                    title: t('settings.about.upgrade.success'),
                    content: t('settings.about.upgrade.success_content'),
                    onOk: () => {
                        window.location.reload();
                    }
                })
                break;
        }
    }, [upgradeStatus.data]);

    let selfUpgrade = useMutation({
        mutationKey: ['upgrade'],
        mutationFn: propertyApi.upgrade,
        onSuccess: async () => {
            upgradeStatus.refetch();
        }
    });

    const renderLatestVersion = () => {
        if (versionQuery.isPending) {
            return <LoadingOutlined/>;
        }
        if (versionQuery.error != null) {
            return <span style={{color: 'red'}}>{t('error')}</span>
        }
        return <span className={'font-normal'}>{versionQuery.data?.latestVersion}</span>;
    }

    // 轻量级 Markdown 渲染器 - 使用纯 React 元素
    const renderSimpleMarkdown = (text: string) => {
        if (!text) return null;
        
        // 分割为行
        const lines = text.split('\n');
        const elements: React.ReactNode[] = [];
        let currentList: { type: 'ul' | 'ol', items: React.ReactNode[] } | null = null;
        let codeBlockStart = -1;
        
        const flushList = () => {
            if (currentList) {
                const ListTag = currentList.type;
                elements.push(
                    <ListTag key={elements.length} className={cn(
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
        
        // 处理行内标记（加粗、斜体、代码）
        const processInlineElements = (text: string): React.ReactNode[] => {
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
        
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            // 处理代码块的结束
            if (codeBlockStart >= 0 && trimmed === '```') {
                const codeLines = lines.slice(codeBlockStart + 1, index);
                if (codeLines.length > 0) {
                    elements.push(
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
                    elements.push(
                        <h1 key={index} className={cn(
                            'font-bold mb-3 mt-4 first:mt-0',
                            isMobile ? 'text-base' : 'text-xl'
                        )}>
                            {content}
                        </h1>
                    );
                } else if (level === 2) {
                    elements.push(
                        <h2 key={index} className={cn(
                            'font-bold mb-2 mt-3 first:mt-0',
                            isMobile ? 'text-sm' : 'text-lg'
                        )}>
                            {content}
                        </h2>
                    );
                } else {
                    elements.push(
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
                elements.push(
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
            elements.push(
                <p key={index} className={cn(
                    'mb-2 leading-relaxed',
                    isMobile ? 'text-xs' : 'text-sm'
                )}>
                    {content}
                </p>
            );
        });
        
        flushList(); // 处理最后的列表
        
        return <div className="markdown-content">{elements}</div>;
    };

    const renderUpdateContent = () => {
        if (versionQuery.isPending) {
            return <LoadingOutlined/>;
        }
        if (versionQuery.error != null) {
            return <span style={{color: 'red'}}>{t('error')}</span>
        }
        let content = versionQuery.data?.content;
        if (!strings.hasText(content)) {
            return <span></span>
        }
        return <SimpleBar
            className={cn(
                'mt-2 p-4 border rounded-md text-sm font-normal bg-white dark:bg-gray-900',
                isMobile ? 'h-[300px] w-full' : 'h-[400px] w-[800px]'
            )}>
            {renderSimpleMarkdown(content)}
        </SimpleBar>;
    }

    useEffect(() => {
        if (versionQuery.data) {
            setCanUpgrade(versionQuery.data?.upgrade);
        }
    }, [versionQuery.data]);

    const handleUpgrade = () => {
        modal.confirm({
            title: t('settings.about.upgrade.title'),
            content: t('settings.about.upgrade.content'),
            onOk: () => {
                selfUpgrade.mutate()
            }
        })
    }
    return (
        <div>
            <Title level={5} style={{marginTop: 0}}>{t('settings.about.setting')}</Title>
            <div className={cn(
                'flex justify-center',
                isMobile ? 'items-start' : 'items-center'
            )}>
                <div className={cn(
                    'space-y-4',
                    isMobile && 'w-full px-2'
                )}>
                    <Title level={5} style={{marginTop: 0}} className={cn(isMobile && 'text-center')}>
                        {brandingQuery.data?.name}
                    </Title>
                    <div className={cn(
                        'flex flex-col gap-1',
                        isMobile ? 'text-left' : 'text-left'
                    )}>
                        <div className={cn('font-bold', isMobile && 'text-sm')}>
                            {t('settings.about.current_version')}: 
                            <span className={'font-normal ml-1'}>{brandingQuery.data?.version}</span>
                        </div>
                        <div className={cn('font-bold', isMobile && 'text-sm')}>
                            {t('settings.about.latest_version')}: {renderLatestVersion()}
                        </div>
                        <div className={cn('font-bold', isMobile && 'text-sm')}>
                            {t('settings.about.update_content')}:
                            {renderUpdateContent()}
                        </div>
                    </div>
                    {
                        !brandingQuery.data?.hiddenUpgrade && !license.isFree() &&
                        <div className={cn(isMobile && 'text-center')}>
                            <Button type="primary"
                                    size={isMobile ? 'middle' : 'large'}
                                    loading={upgradeStatus.isPending || upgradeStatus.data?.status == "running"}
                                    disabled={!canUpgrade}
                                    onClick={handleUpgrade}>
                                {t('settings.about.upgrade.action')}
                            </Button>
                        </div>
                    }
                </div>
            </div>
        </div>
    );
};

export default About;