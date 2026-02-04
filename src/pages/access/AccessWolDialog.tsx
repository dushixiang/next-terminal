import React, {useState, useEffect, useRef} from 'react';
import {Alert, Button, Modal, Space, Typography} from 'antd';
import {useTranslation} from 'react-i18next';
import portalApi from '@/api/portal-api';

const {Text} = Typography;

interface AccessWolDialogProps {
    open: boolean;
    assetId: string;
    assetName: string;
    onSuccess: () => void;
    onCancel: () => void;
}

const AccessWolDialog: React.FC<AccessWolDialogProps> = ({
                                                             open,
                                                             assetId,
                                                             assetName,
                                                             onSuccess,
                                                             onCancel,
                                                         }) => {
    const {t} = useTranslation();
    const [status, setStatus] = useState<'idle' | 'waking' | 'countdown' | 'checking' | 'online' | 'offline' | 'failed'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [countdown, setCountdown] = useState(0); // 当前倒计时值
    const [checkLoading, setCheckLoading] = useState(false);
    const [wakingLoading, setWakingLoading] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // 重置所有状态
    const resetState = () => {
        setStatus('idle');
        setErrorMessage('');
        setCountdown(0);
        setCheckLoading(false);
        setWakingLoading(false);
        // 清理定时器
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    // 监听 open 变化，打开时重置所有状态，关闭时清理定时器
    useEffect(() => {
        if (open) {
            resetState();
        } else {
            // 关闭时清理定时器，避免内存泄漏
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // 倒计时效果，每秒减1
    useEffect(() => {
        if (status === 'countdown') {
            timerRef.current = setInterval(() => {
                setCountdown(prev => {
                    const next = prev - 1;
                    if (next <= 0) {
                        // 倒计时结束，清理定时器并触发检测
                        if (timerRef.current) {
                            clearInterval(timerRef.current);
                            timerRef.current = null;
                        }
                        // 延迟一点时间再触发检测，避免状态更新冲突
                        setTimeout(() => {
                            handleCheck();
                        }, 100);
                        return 0;
                    }
                    return next;
                });
            }, 1000);

            return () => {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    const handleWakeUp = async () => {
        setStatus('waking');
        setWakingLoading(true);
        setErrorMessage('');

        try {
            // 调用 WOL 接口
            const wolResult = await portalApi.wakeOnLan(assetId);
            if (wolResult.error) {
                setStatus('failed');
                setErrorMessage(wolResult.error);
                setWakingLoading(false);
                return;
            }

            // 开始倒计时
            setCountdown(wolResult.delay);
            setStatus('countdown');
            setWakingLoading(false);
        } catch (error: any) {
            setStatus('failed');
            setErrorMessage(error.message || t('access.wol.failed'));
            setWakingLoading(false);
        }
    };

    const handleCheck = async () => {
        setCheckLoading(true);
        setStatus('checking');

        try {
            const pingResult = await portalApi.pingAsset(assetId);
            if (pingResult.active) {
                setStatus('online');
            } else {
                setStatus('offline');
            }
        } catch (error: any) {
            setStatus('offline');
        } finally {
            setCheckLoading(false);
        }
    };

    const handleConnect = () => {
        onSuccess();
    };

    const handleCancel = () => {
        resetState();
        onCancel();
    };

    const renderContent = () => {
        switch (status) {
            case 'idle':
                return (
                    <Text>{t('access.wol.message', {name: assetName})}</Text>
                );
            case 'waking':
                return (
                    <Text>{t('access.wol.waking')}</Text>
                );
            case 'countdown':
                return (
                    <Space direction="vertical" style={{width: '100%', alignItems: 'center'}} size="large">
                        <Text>{t('access.wol.countdown_message')}</Text>
                        <div style={{textAlign: 'center', fontSize: 48, fontWeight: 'bold', color: '#1890ff'}}>
                            {countdown} {t('general.second')}
                        </div>
                    </Space>
                );
            case 'checking':
                return (
                    <Text>{t('access.wol.checking')}</Text>
                );
            case 'online':
                return (
                    <Alert
                        message={t('access.wol.online')}
                        description={t('access.wol.online_desc')}
                        type="success"
                        showIcon
                    />
                );
            case 'offline':
                return (
                    <Alert
                        message={t('access.wol.offline')}
                        description={t('access.wol.offline_desc')}
                        type="warning"
                        showIcon
                    />
                );
            case 'failed':
                return (
                    <Alert
                        message={t('access.wol.failed')}
                        description={errorMessage}
                        type="error"
                        showIcon
                    />
                );
            default:
                return null;
        }
    };

    const renderFooter = () => {
        if (status === 'idle') {
            return [
                <Button key="cancel" onClick={handleCancel}>
                    {t('actions.cancel')}
                </Button>,
                <Button key="ok" type="primary" onClick={handleWakeUp} loading={wakingLoading}>
                    {t('access.wol.confirm')}
                </Button>,
            ];
        }

        if (status === 'countdown' || status === 'checking' || status === 'online' || status === 'offline') {
            return [
                <Button key="cancel" onClick={handleCancel}>
                    {t('actions.cancel')}
                </Button>,
                <Button
                    key="check"
                    onClick={handleCheck}
                    loading={checkLoading}
                    disabled={status === 'checking' || (status === 'countdown' && countdown > 5)}
                >
                    {t('access.wol.check_now')}
                </Button>,
                status === 'online' && (
                    <Button key="connect" type="primary" onClick={handleConnect}>
                        {t('access.wol.connect')}
                    </Button>
                ),
            ].filter(Boolean);
        }

        return [
            <Button key="close" onClick={handleCancel}>
                {t('actions.cancel')}
            </Button>,
        ];
    };

    return (
        <Modal
            title={t('access.wol.title')}
            open={open}
            onCancel={handleCancel}
            footer={renderFooter()}
            maskClosable={false}
        >
            {renderContent()}
        </Modal>
    );
};

export default AccessWolDialog;
