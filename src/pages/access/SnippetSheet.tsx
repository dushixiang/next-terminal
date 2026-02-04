import React, {useEffect, useState} from 'react';
import {useMutation, useQuery} from "@tanstack/react-query";
import {App, Button, Drawer, Input, Spin} from "antd";
import snippetUserApi from "@/api/snippet-user-api";
import {Snippet} from "@/api/snippet-api";
import {useTranslation} from "react-i18next";
import {ChevronDown, ChevronUp, CirclePlay} from "lucide-react";
import SnippetUserModal from "@/pages/facade/SnippetUserModal";

interface Props {
    open: boolean
    onClose: () => void
    onUse: (content: string) => void
    placement?: 'top' | 'right' | 'bottom' | 'left'
    mask?: boolean
    maskClosable?: boolean
}

const SnippetSheet = ({open, onClose, onUse, placement, mask, maskClosable}: Props) => {

    let {t} = useTranslation();
    let {message} = App.useApp();
    let [snippets, setSnippets] = useState<Snippet[]>();
    let [searching, setSearching] = useState<boolean>();
    let [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    let [modalOpen, setModalOpen] = useState<boolean>(false);

    let query = useQuery({
        queryKey: ['snippets'],
        queryFn: snippetUserApi.getAll,
        enabled: open
    });

    useEffect(() => {
        let snippets = query.data;
        setSnippets(snippets);
    }, [query.data])

    const postOrUpdate = async (values: any) => {
        if (values['id']) {
            await snippetUserApi.updateById(values['id'], values);
        } else {
            await snippetUserApi.create(values);
        }
    }

    let mutation = useMutation({
        mutationFn: postOrUpdate,
        onSuccess: () => {
            query.refetch();
            setModalOpen(false);
            message.success(t('general.success'));
        }
    });

    const handleSearch = (value: string) => {
        setSearching(true);
        let snippets = query.data?.filter(item => {
            return item.name.toLowerCase().includes(value.toLowerCase());
        });
        setSnippets(snippets);
        setSearching(false);
        console.log('search', value, snippets)
    }

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }

    const isContentLong = (content: string) => {
        const lines = content.split('\n').length;
        return lines > 5 || content.length > 200;
    }

    if (!placement) {
        placement = 'right';
    }

    return (
        <>
            <Drawer title={t('menus.resource.submenus.snippet')}
                    placement={placement}
                    onClose={onClose}
                    open={open}
                    mask={mask}
                    maskClosable={maskClosable}
                    push={false}
                    extra={
                        <div className="flex items-center gap-2">
                            <Button type={'link'}
                                    onClick={() => setModalOpen(true)}
                                    style={{padding: 0}}
                            >
                                {t('actions.new')}
                            </Button>
                            <Button type={'link'}
                                    onClick={() => query.refetch()}
                                    style={{padding: 0}}
                            >
                                {t('actions.refresh')}
                            </Button>
                        </div>
                    }
                    getContainer={false}
            >
                <Input.Search placeholder={t('access.search')}
                              onSearch={handleSearch}
                              loading={searching}
                              style={{marginBottom: 16}}/>

                <Spin spinning={query.isFetching}>
                    <div className='space-y-4'>
                        {snippets?.map(item => {
                            const isExpanded = expandedIds.has(item.id);
                            const isLong = isContentLong(item.content);

                            return <div className={'p-4 border rounded-lg bg-[#1B1B1B]'} key={item.id}>

                                <div className='flex items-center gap-2 justify-between mb-4'>
                                    <div className='font-medium  text-gray-700 dark:text-gray-300'>
                                        {item.name}
                                    </div>
                                    <div className='flex items-center gap-2'>
                                        {isLong && (
                                            <button
                                                onClick={() => toggleExpand(item.id)}
                                                className="text-blue-400 hover:text-blue-300 cursor-pointer transition-colors"
                                            >
                                                {isExpanded ? (
                                                    <ChevronUp className="h-4 w-4"/>
                                                ) : (
                                                    <ChevronDown className="h-4 w-4"/>
                                                )}
                                            </button>
                                        )}
                                        <CirclePlay
                                            className="h-4 w-4 text-green-400 hover:text-green-300 cursor-pointer"
                                            onClick={() => onUse(item.content)}
                                        />
                                    </div>
                                </div>

                                <div className={'text-xs text-gray-700 dark:text-gray-300'}>
                                <pre style={{
                                    whiteSpace: 'pre-wrap',
                                    wordWrap: 'break-word',
                                    overflowWrap: 'break-word',
                                    wordBreak: 'break-word',
                                    hyphens: 'auto',
                                    maxHeight: isLong && !isExpanded ? '113px' : 'none',
                                    overflow: 'hidden',
                                    position: 'relative'
                                }}>
                                    {item.content}
                                </pre>
                                    {isLong && !isExpanded && (
                                        <div
                                            className="text-blue-400 hover:text-blue-300 cursor-pointer mt-2 text-xs"
                                            onClick={() => toggleExpand(item.id)}
                                        >
                                            {t('access.snippet_expand')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        })}
                    </div>
                </Spin>
            </Drawer>

            <SnippetUserModal
                id={undefined}
                open={modalOpen}
                confirmLoading={mutation.isPending}
                handleCancel={() => setModalOpen(false)}
                handleOk={mutation.mutate}
            />
        </>
    );
};

export default SnippetSheet;
