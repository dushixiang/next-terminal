import React, {useCallback, useEffect, useRef, useState} from 'react';
import {App, ConfigProvider, theme} from 'antd';
import './AccessPage.css';
import {ResizableHandle, ResizablePanelGroup} from '@/components/ui/resizable';
import {ThemeProvider} from '@/components/theme-provider';
import AccessTheme from '@/pages/access/AccessTheme';
import AccessSetting from '@/pages/access/AccessSetting';
import {useWindowSize} from 'react-use';
import {useAccessTab} from '@/pages/access/hooks/use-access-tab';
import {StyleProvider} from '@ant-design/cssinjs';
import {beforeUnload, generateRandomId, handleKeyDown} from '@/utils/utils';
import {useAccessContentSize} from '@/pages/access/hooks/use-access-size';
import {useSearchParams} from 'react-router-dom';
import {ImperativePanelHandle} from 'react-resizable-panels';
import AccessSshChooser from '@/pages/access/AccessSshChooser';
import AccessTerminalBulk from '@/pages/access/AccessTerminalBulk';
import MultiFactorAuthentication from '@/pages/account/MultiFactorAuthentication';
import AccessWolDialog from '@/pages/access/AccessWolDialog';
import {safeDecode} from '@/utils/codec';
import {setThemeColor} from '@/utils/theme';
import {translateI18nToAntdLocale} from '@/helper/lang';
import i18n from 'i18next';
import {useTabOperations} from '@/pages/access/hooks/use-tab-operations';
import AccessHeader from '@/pages/access/components/AccessHeader';
import AccessSidebar from '@/pages/access/components/AccessSidebar';
import AccessTabContainer from '@/pages/access/components/AccessTabContainer';
import portalApi from '@/api/portal-api';
import {useTranslation} from 'react-i18next';
import {LocalStorage, STORAGE_KEYS} from '@/utils/storage';
import AccessTerminal from '@/pages/access/AccessTerminal';
import AccessGuacamole from '@/pages/access/AccessGuacamole';

export interface AccessTabSyncMessage {
    id: string;
    name: string;
    protocol: string;
    status?: string;
    wolEnabled?: boolean;
}

const AccessPage = () => {
    const {t} = useTranslation();
    const {height} = useWindowSize();
    const [activeKey, setActiveKey] = useAccessTab();
    const [_, setContentSize] = useAccessContentSize();
    const [searchParams, setSearchParams] = useSearchParams();
    const leftRef = useRef<ImperativePanelHandle>(null);

    // 标签页操作
    const {
        items,
        addTab,
        removeTab,
        handleCloseLeft,
        handleCloseRight,
        handleCloseAll,
        handleCloseOthers,
        handleReconnect,
        onDragEnd,
    } = useTabOperations(activeKey, setActiveKey);

    // 打开资产标签页
    const openAssetTab = useCallback((msg: AccessTabSyncMessage) => {
        const randomId = generateRandomId();
        const key = randomId + '_' + msg.id;

        switch (msg.protocol) {
            case "ssh":
            case "telnet":
                addTab(key, msg.name, <AccessTerminal assetId={msg.id}/>);
                break;
            case "rdp":
                addTab(key, msg.name, <AccessGuacamole assetId={msg.id}/>);
                break;
            default:
                addTab(key, msg.name, <AccessGuacamole assetId={msg.id}/>);
                break;
        }
    }, [addTab]);

    // 面板状态管理
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return LocalStorage.get(STORAGE_KEYS.COLLAPSED_STATE, false);
    });

    const [leftPanelSize, setLeftPanelSize] = useState(() => {
        const savedSizes = LocalStorage.get(STORAGE_KEYS.PANEL_SIZES, {left: 15, right: 85});
        return savedSizes.left;
    });

    const handlePanelResize = useCallback((size: number) => {
        setLeftPanelSize(size);
        const panelSizes = {left: size, right: 100 - size};
        LocalStorage.set(STORAGE_KEYS.PANEL_SIZES, panelSizes);

        const collapsed = size === 2;
        if (collapsed !== isCollapsed) {
            setIsCollapsed(collapsed);
            LocalStorage.set(STORAGE_KEYS.COLLAPSED_STATE, collapsed);
        }

        setContentSize(100 - size);
    }, [isCollapsed, setContentSize]);

    // 对话框状态管理
    const [sshChooserOpen, setSSHChooserOpen] = useState(false);
    const [mfaOpen, setMfaOpen] = useState(false);
    const [chooseAssetIds, setChooseAssetIds] = useState<string[]>([]);
    const [wolDialogOpen, setWolDialogOpen] = useState(false);
    const [wolAssetInfo, setWolAssetInfo] = useState<{
        id: string;
        name: string;
        protocol: string;
    } | null>(null);

    // 初始化：设置样式和事件监听
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        window.addEventListener('beforeunload', beforeUnload, true);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('beforeunload', beforeUnload, true);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        setThemeColor('#313131');
    }, []);

    // 处理 URL 参数自动打开资产
    useEffect(() => {
        const defaultAsset = searchParams.get('asset');
        if (defaultAsset) {
            try {
                const msg = safeDecode(defaultAsset) as AccessTabSyncMessage;
                if (msg) {
                    // 检查是否需要 WOL 唤醒
                    if (msg.status === 'inactive' && msg.wolEnabled) {
                        setWolAssetInfo({
                            id: msg.id,
                            name: msg.name,
                            protocol: msg.protocol,
                        });
                        setWolDialogOpen(true);
                    } else {
                        openAssetTab(msg);
                    }
                }
            } catch (error) {
                console.warn('Invalid access asset param:', error);
            }

            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('asset');
            setSearchParams(nextParams, {replace: true});
        }
    }, [openAssetTab, searchParams, setSearchParams]);

    // 处理树节点双击
    const handleNodeDoubleClick = useCallback((node: any) => {
        // 检查是否需要 WOL 唤醒
        if (node.extra?.status === 'inactive' && node.extra?.wolEnabled) {
            setWolAssetInfo({
                id: node.key as string,
                name: node.title as string,
                protocol: node.extra?.protocol,
            });
            setWolDialogOpen(true);
            return;
        }

        // 直接打开连接
        openAssetTab({
            id: node.key,
            name: node.title,
            protocol: node.extra?.protocol,
        });
    }, [openAssetTab]);

    // 处理顶部按钮点击
    const handleThemeClick = useCallback(() => {
        addTab('theme', t('access.settings.theme'), <AccessTheme/>);
    }, [addTab, t]);

    const handleSettingClick = useCallback(() => {
        addTab('setting', t('menus.setting.label'), <AccessSetting/>);
    }, [addTab, t]);

    const handleBatchSSHClick = useCallback(() => {
        setSSHChooserOpen(true);
    }, []);

    // 处理 SSH 选择器确认
    const handleSSHChooserOk = useCallback(async (values: string[]) => {
        const required = await portalApi.getAccessRequireMFA();
        if (required) {
            setMfaOpen(true);
            setChooseAssetIds(values);
        } else {
            setSSHChooserOpen(false);
            const key = generateRandomId();
            addTab(key, t('access.batch.exec'), <AccessTerminalBulk assetIds={values}/>);
        }
    }, [addTab, t]);

    // 处理 MFA 确认
    const handleMFAOk = useCallback(async (securityToken: string) => {
        setMfaOpen(false);
        setSSHChooserOpen(false);
        const key = generateRandomId();
        addTab(
            key,
            t('access.batch.exec'),
            <AccessTerminalBulk assetIds={chooseAssetIds} securityToken={securityToken}/>
        );
    }, [chooseAssetIds, addTab, t]);

    // 处理 WOL 成功
    const handleWOLSuccess = useCallback(() => {
        setWolDialogOpen(false);
        // 唤醒成功后自动打开连接
        if (wolAssetInfo) {
            openAssetTab({
                id: wolAssetInfo.id,
                name: wolAssetInfo.name,
                protocol: wolAssetInfo.protocol,
            });
        }
        setWolAssetInfo(null);
    }, [wolAssetInfo, openAssetTab]);

    return (
        <ConfigProvider
            theme={{
                components: {
                    Tabs: {
                        titleFontSizeSM: 13,
                    },
                },
                algorithm: theme.darkAlgorithm,
            }}
            locale={translateI18nToAntdLocale(i18n.language)}
        >
            <App>
                <StyleProvider hashPriority="high">
                    <div className={'h-screen w-screen overflow-hidden'}>
                        <AccessHeader
                            onThemeClick={handleThemeClick}
                            onSettingClick={handleSettingClick}
                            onBatchSSHClick={handleBatchSSHClick}
                        />

                        <ThemeProvider defaultTheme="dark" storageKey="nt-ui-theme">
                            <ResizablePanelGroup direction="horizontal">
                                <AccessSidebar
                                    isCollapsed={isCollapsed}
                                    leftPanelSize={leftPanelSize}
                                    height={height}
                                    onResize={handlePanelResize}
                                    leftRef={leftRef}
                                    onNodeDoubleClick={handleNodeDoubleClick}
                                />

                                <ResizableHandle withHandle/>

                                <AccessTabContainer
                                    items={items}
                                    activeKey={activeKey}
                                    leftPanelSize={leftPanelSize}
                                    onChange={setActiveKey}
                                    onRemove={removeTab}
                                    onDragEnd={onDragEnd}
                                    onContentResize={setContentSize}
                                    tabOperations={{
                                        handleCloseLeft,
                                        handleCloseRight,
                                        handleCloseAll,
                                        handleCloseOthers,
                                        handleReconnect,
                                    }}
                                />
                            </ResizablePanelGroup>

                            {/* 对话框 */}
                            <AccessSshChooser
                                open={sshChooserOpen}
                                handleCancel={() => setSSHChooserOpen(false)}
                                handleOk={handleSSHChooserOk}
                            />

                            <MultiFactorAuthentication
                                open={mfaOpen}
                                handleOk={handleMFAOk}
                                handleCancel={() => setMfaOpen(false)}
                            />

                            <AccessWolDialog
                                open={wolDialogOpen}
                                assetId={wolAssetInfo?.id || ''}
                                assetName={wolAssetInfo?.name || ''}
                                onSuccess={handleWOLSuccess}
                                onCancel={() => {
                                    setWolDialogOpen(false);
                                    setWolAssetInfo(null);
                                }}
                            />
                        </ThemeProvider>
                    </div>
                </StyleProvider>
            </App>
        </ConfigProvider>
    );
};

export default AccessPage;
