import React, {useState} from 'react';
import AccessTerminalBulkItem from "@/src/pages/access/AccessTerminalBulkItem";
import {FolderCodeIcon, TerminalIcon} from "lucide-react";
import eventEmitter from "@/src/api/core/event-emitter";
import {ScrollArea} from "@/components/ui/scroll-area";
import {useWindowSize} from "react-use";
import SnippetSheet from "@/src/pages/access/SnippetSheet";

interface Props {
    assetIds: string[];
    securityToken?: string;
}

const AccessTerminalBulk = ({assetIds, securityToken}: Props) => {

    let [inputValue, setInputValue] = useState('');

    let {height} = useWindowSize();
    // 添加一个状态来记录哪些元素是隐藏的
    const [hiddenAssetIds, setHiddenAssetIds] = useState<string[]>([]);
    let [snippetOpen, setSnippetOpen] = useState(false);

    const handleCommand = () => {
        // alert(`qqq-[${inputValue}]`)
        if (inputValue === '') {
            eventEmitter.emit("WS:MESSAGE", '\n');
            return
        }
        setInputValue('');
        eventEmitter.emit("WS:MESSAGE", inputValue)
    }

    const handleClose = React.useCallback((assetId: string) => {
        // 更新隐藏元素的状态
        setHiddenAssetIds(prev => [...prev, assetId]);
    }, []);

    return (
        <div className={'p-4'}>
            <div className={'relative mb-4'}>
                <div className={'absolute inset-y-0 grid w-10 place-content-center'}>
                    <TerminalIcon className={'w-4 h-4 text-white'}/>
                </div>
                <input
                    className="block p-3 pl-8 px-4 w-full z-20 text-sm text-gray-200 ring-[#1063FF] focus:ring-1 focus:outline-none rounded-md bg-border"
                    placeholder="command"
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
            <ScrollArea style={{
                height: height - 164,
            }}>
                {/*{JSON.stringify(hiddenAssetIds)}*/}
                <div className={'grid grid-cols-2 gap-4'}>
                    {assetIds.filter(assetId => !hiddenAssetIds.includes(assetId)).map((assetId: string) => {
                        return <div>
                            <AccessTerminalBulkItem assetId={assetId}
                                                    securityToken={securityToken}
                                                    onClose={() => {
                                                        // console.log(`close`, assetId)
                                                        // handleClose(assetId)
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