import {useId, useState} from 'react';
import AccessTerminalBulkItem from "@/pages/access/AccessTerminalBulkItem";
import {FolderCodeIcon, TerminalIcon} from "lucide-react";
import eventEmitter from "@/api/core/event-emitter";
import {ScrollArea} from "@/components/ui/scroll-area";
import SnippetSheet from "@/pages/access/SnippetSheet";
import {useTranslation} from 'react-i18next';

interface Props {
    assetIds: string[];
    securityToken?: string;
}

const AccessTerminalBulk = ({assetIds, securityToken}: Props) => {

    const tabId = useId();
    const {t} = useTranslation();
    let [inputValue, setInputValue] = useState('');

    // 添加一个状态来记录哪些元素是隐藏的
    const [hiddenAssetIds, setHiddenAssetIds] = useState<string[]>([]);
    let [snippetOpen, setSnippetOpen] = useState(false);

    const handleCommand = () => {
        if (inputValue === '') {
            eventEmitter.emit(`WS:MESSAGE:${tabId}`, '\r');
            return
        }
        setInputValue('');
        eventEmitter.emit(`WS:MESSAGE:${tabId}`, inputValue)
    }

    const handleClose = (assetId: string) => {
        // 更新隐藏元素的状态
        setHiddenAssetIds(prev => [...prev, assetId]);
    };

    return (
        <div className={'flex h-full min-h-0 flex-col p-4'}>
            <div className={'relative mb-4 shrink-0'}>
                <div className={'absolute inset-y-0 grid w-10 place-content-center'}>
                    <TerminalIcon className={'w-4 h-4 text-white'}/>
                </div>
                <input
                    className="block p-3 pl-8 px-4 w-full z-20 text-sm text-gray-200 ring-[#1063FF] focus:ring-1 focus:outline-none rounded-md bg-border"
                    placeholder={t('access.terminal.bulk_command_placeholder')}
                    required
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleCommand()
                        }
                    }}
                />
                <div className={'absolute inset-y-0 right-0 grid w-10 place-content-center cursor-pointer'}>
                    <FolderCodeIcon className={'h-4 w-4'}
                                    onClick={() => setSnippetOpen(true)}
                    />
                </div>
            </div>
            <ScrollArea className="min-h-0 flex-1">
                <div className={'grid grid-cols-1 gap-4 xl:grid-cols-2'}>
                    {assetIds.filter(assetId => !hiddenAssetIds.includes(assetId)).map((assetId: string) => {
                        return <div key={assetId}>
                            <AccessTerminalBulkItem assetId={assetId}
                                                    securityToken={securityToken}
                                                    tabId={tabId}
                                                    onClose={() => {
                                                        handleClose(assetId)
                                                    }}
                            />
                        </div>;
                    })}
                </div>
            </ScrollArea>

            <SnippetSheet
                onClose={() => setSnippetOpen(false)}
                onUse={(content: string) => {
                    setInputValue(content);
                }}
                open={snippetOpen}
                mask={false}
            />
        </div>
    );
};

export default AccessTerminalBulk;
