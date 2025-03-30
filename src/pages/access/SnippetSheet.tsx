import React, {useEffect, useState} from 'react';
import {useQuery} from "@tanstack/react-query";
import {Button, Drawer, Input, Spin} from "antd";
import {ProCard} from "@ant-design/pro-components";
import {ReloadOutlined} from '@ant-design/icons'
import snippetUserApi from "@/src/api/snippet-user-api";
import {Snippet} from "@/src/api/snippet-api";
import {useTranslation} from "react-i18next";

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
    let [snippets, setSnippets] = useState<Snippet[]>();
    let [searching, setSearching] = useState<boolean>();

    let query = useQuery({
        queryKey: ['snippets'],
        queryFn: snippetUserApi.getAll,
        enabled: open
    });

    useEffect(() => {
        let snippets = query.data;
        setSnippets(snippets);
    }, [query.data])

    const handleSearch = (value: string) => {
        setSearching(true);
        let snippets = query.data?.filter(item => {
            return item.name.includes(value);
        });
        setSnippets(snippets);
        setSearching(false);
        console.log('search', value, snippets)
    }

    if (!placement) {
        placement = 'right';
    }

    return (
        <Drawer title={t('menus.resource.submenus.snippet')}
                placement={placement}
                onClose={onClose}
                open={open}
                mask={mask}
                maskClosable={maskClosable}
                push={false}
                extra={<Button type={'link'} icon={<ReloadOutlined/>} onClick={() => query.refetch()}/>}
                getContainer={false}
        >
            <Input.Search placeholder={t('access.search')}
                          onSearch={handleSearch}
                          loading={searching}
                          style={{marginBottom: 16}}/>

            <Spin spinning={query.isFetching}>
                <div>
                    {
                        snippets?.map(item => {
                            return <div className={'pb-2'} key={item.id}>
                                <ProCard
                                    title={item.name}
                                    extra={
                                        <Button type={'link'} size={'small'} onClick={() => {onUse(item.content)}}>{t('access.use')}</Button>
                                    }
                                    bordered={true}
                                >
                                    <div className={'text-xs  text-gray-700 dark:text-gray-300'}>
                                        <pre style={{
                                            whiteSpace: 'pre-wrap',
                                            wordWrap: 'break-word',
                                            overflowWrap: 'break-word',
                                            wordBreak: 'break-word',
                                            hyphens: 'auto'
                                        }}>{item.content}</pre>
                                    </div>
                                </ProCard>
                            </div>
                        })
                    }
                </div>
            </Spin>
        </Drawer>
    );
};

export default SnippetSheet;