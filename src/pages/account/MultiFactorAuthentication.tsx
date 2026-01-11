import React, {useEffect, useMemo, useState} from 'react';
import {Button, Card, Modal, Result, Space, Spin} from "antd";
import accountApi, {AuthType} from "@/api/account-api";
import {startAuthentication} from "@simplewebauthn/browser";
import {REGEXP_ONLY_DIGITS} from "input-otp";
import {InputOTP, InputOTPGroup, InputOTPSlot} from "@/components/ui/input-otp";
import {useMutation, useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {KeyOutlined, SafetyOutlined} from "@ant-design/icons";

export interface Props {
    open: boolean
    handleOk: (securityToken: string) => void
    handleCancel: () => void
}

interface Error {
    code?: number | string
    message?: string
}

const MultiFactorAuthentication = ({open, handleOk, handleCancel}: Props) => {
    const {t} = useTranslation();

    const [authType, setAuthType] = useState<AuthType>('');
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(false);
    const [otpValue, setOtpValue] = useState('');
    const [showSelector, setShowSelector] = useState(false);
    const [otpKey, setOtpKey] = useState(0); // 用于强制重新挂载 InputOTP

    // 查询支持的认证类型
    const {data: supportedAuthTypes = []} = useQuery({
        queryKey: ['securityTokenSupportTypes'],
        queryFn: accountApi.getSecurityTokenSupportTypes,
        enabled: open,
    });

    // 认证类型配置
    const authTypeConfigs = useMemo(() => [
        {
            key: 'passkey' as const,
            icon: <SafetyOutlined style={{fontSize: 32}}/>,
            title: t('account.auth_type_passkey'),
            description: t('account.auth_type_passkey_desc'),
        },
        {
            key: 'otp' as const,
            icon: <KeyOutlined style={{fontSize: 32}}/>,
            title: t('account.auth_type_otp'),
            description: t('account.auth_type_otp_desc'),
        },
    ], [t]);

    // 重置状态
    const resetState = () => {
        setError(null);
        setLoading(false);
        setOtpValue('');
        setShowSelector(false);
        setAuthType('');
    };

    // 清除输入
    const clearInputs = () => {
        setError(null);
        setOtpValue('');
    };

    // 处理认证类型切换
    const handleAuthTypeChange = (type: AuthType) => {
        clearInputs();
        setAuthType(type);
        setShowSelector(false);
    };

    const storeSecurityToken = (securityToken: string) => {
        sessionStorage.setItem('securityToken', securityToken);
        handleOk(securityToken);
    }

    const validateSecurityToken = () => {
        const securityToken = sessionStorage.getItem('securityToken');
        if (securityToken) {
            // 检查 Token 是否有效，有效则直接使用
            accountApi.validateSecurityToken(securityToken).then((ok) => {
                if (ok) {
                    storeSecurityToken(securityToken);
                } else {
                    // 无效则清除
                    sessionStorage.removeItem('securityToken');
                }
            });
        }
    }

    // Passkey 认证
    const authenticateWithPasskey = async () => {
        setError(null);
        setLoading(true);
        try {
            const data = await accountApi.generateSecurityTokenByWebauthnStart();
            if (!data.publicKey || !data.token) {
                setAuthType('none');
                return;
            }

            const authentication = await startAuthentication({optionsJSON: data.publicKey});
            const securityToken = await accountApi.generateSecurityTokenByWebauthnFinish(data.token, authentication);
            storeSecurityToken(securityToken);
        } catch (e: any) {
            const code = typeof e?.code === 'number' ? e.code : undefined;
            setError({code, message: e?.message || String(e)});
        } finally {
            setLoading(false);
        }
    };

    // OTP 认证
    const validateOTP = useMutation({
        mutationFn: accountApi.generateSecurityTokenByMfa,
        onSuccess: (token) => token && storeSecurityToken(token),
        onError: (e: any) => {
            setOtpValue('');
            setOtpKey(prev => prev + 1); // 强制重新挂载以重新获得焦点
            const code = typeof e?.code === 'number' ? e.code : 1;
            setError({code, message: e?.message || String(e)});
        }
    });

    const handleOTPComplete = (value: string) => {
        setError(null);
        if (value.length === 6 && !validateOTP.isPending) {
            validateOTP.mutate(parseInt(value));
        }
    };

    // 弹窗打开/关闭处理
    useEffect(() => {
        if (!open) {
            resetState();
            return;
        }

        // 打开时显示选择器或设置状态
        if (supportedAuthTypes.length > 0) {
            if (supportedAuthTypes.length == 1) {
                setAuthType(supportedAuthTypes[0]);
                setShowSelector(false);
            } else {
                // 有可用的认证方式
                if (!authType || authType === 'none') {
                    setAuthType('');
                    setShowSelector(true);
                }
            }
        } else if (supportedAuthTypes.length === 0 && authType !== 'none') {
            // 没有可用的认证方式
            setAuthType('none');
        }
    }, [open, supportedAuthTypes, authType]);

    // Passkey 自动认证
    useEffect(() => {
        if (authType === 'passkey' && !showSelector && open) {
            authenticateWithPasskey();
        }
    }, [authType, showSelector, open]);

    useEffect(() => {
        if (open) {
            // 检查是否有存储的 securityToken
            validateSecurityToken();
        }
    }, [open]);

    // 渲染选择器
    const renderSelector = () => (
        <div className={'space-y-4'}>
            <div className={'text-center text-gray-600 font-medium'}>
                {t('account.select_auth_type')}
            </div>
            <div className={'grid grid-cols-1 gap-3'}>
                {authTypeConfigs.map((config) => {
                    const isSupported = supportedAuthTypes.includes(config.key);
                    return (
                        <Card
                            key={config.key}
                            hoverable={isSupported}
                            className={`cursor-pointer transition-all ${
                                isSupported
                                    ? 'hover:border-blue-500 hover:shadow-md'
                                    : 'opacity-50 cursor-not-allowed bg-gray-50'
                            }`}
                            onClick={() => isSupported && handleAuthTypeChange(config.key)}
                            style={{borderColor: isSupported ? '#d9d9d9' : '#f0f0f0'}}
                        >
                            <div className={'flex items-center gap-3'}>
                                <div className={isSupported ? 'text-blue-500' : 'text-gray-400'}>
                                    {config.icon}
                                </div>
                                <div className={'flex-1'}>
                                    <div className={'font-medium text-base'}>
                                        {config.title}
                                        {!isSupported && (
                                            <span className={'ml-2 text-xs text-gray-400'}>
                                                ({t('account.auth_type_unavailable')})
                                            </span>
                                        )}
                                    </div>
                                    <div className={'text-sm text-gray-500 mt-1'}>
                                        {config.description}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );

    // 渲染切换按钮
    const renderSwitchButton = () =>
        supportedAuthTypes.length > 1 && (
            <div className={'text-center'}>
                <Button type="link" onClick={() => setShowSelector(true)}>
                    {t('account.mfa_change_way')}
                </Button>
            </div>
        );

    // 渲染错误提示
    const renderError = () => {
        if (!error) {
            return <div className={'min-h-[24px] text-sm'}/>;
        }

        let content: React.ReactNode = null;
        if (typeof error.code === 'number' && error.code > 0) {
            const key = `errors.${error.code}`;
            const translated = t(key);
            content = translated !== key ? translated : error.message;
        } else {
            content = error.message;
        }

        return (
            <div className={'min-h-[24px] text-sm'}>
                {content && <div className={'text-red-500'}>{content}</div>}
            </div>
        );
    };


    // 渲染未配置提示
    const renderNoMFA = () => (
        <Result
            title={t('account.no_mfa_title')}
            subTitle={t('account.no_mfa_subtitle')}
            extra={
                <Space>
                    <Button
                        color="geekblue"
                        variant={'filled'}
                        onClick={() => window.location.href = '/info?activeKey=otp'}
                    >
                        {t('account.enable_otp')}
                    </Button>
                    <Button
                        color="green"
                        variant={'filled'}
                        onClick={() => window.location.href = '/info?activeKey=passkey'}
                    >
                        {t('account.enable_passkey')}
                    </Button>
                </Space>
            }
        />
    );

    // 渲染 OTP 输入
    const renderOTP = () => (
        <div className={'flex items-center justify-center'}>
            <div className={'space-y-4'}>
                <div className={'font-bold'}>{t('account.otp_code_label')}</div>
                <InputOTP
                    key={otpKey}
                    maxLength={6}
                    pattern={REGEXP_ONLY_DIGITS}
                    onComplete={handleOTPComplete}
                    autoFocus
                    value={otpValue}
                    onChange={(newValue) => {
                        setOtpValue(newValue);
                        setError(null);
                    }}
                    disabled={validateOTP.isPending}
                >
                    <InputOTPGroup>
                        {[...Array(6)].map((_, i) => <InputOTPSlot key={i} index={i}/>)}
                    </InputOTPGroup>
                </InputOTP>
                {renderError()}
                {renderSwitchButton()}
            </div>
        </div>
    );

    // 渲染 Passkey 失败
    const renderPasskeyError = () => (
        <Result
            status="error"
            title={t('account.mfa_auth_failed')}
            subTitle={error?.message}
            extra={
                <div className={'flex items-center justify-center gap-2'}>
                    <Button
                        color="primary"
                        variant={'solid'}
                        onClick={authenticateWithPasskey}
                    >
                        {t('account.mfa_retry')}
                    </Button>
                    {supportedAuthTypes.length > 1 && (
                        <Button
                            color="primary"
                            variant={'dashed'}
                            onClick={() => {
                                setError(null);
                                setShowSelector(true);
                            }}
                        >
                            {t('account.mfa_change_way')}
                        </Button>
                    )}
                </div>
            }
        />
    );

    const renderPasskeyPending = () => (
        <div className={'space-y-3 text-center'}>
            <div className={'text-lg font-medium'}>{t('account.mfa_authing')}</div>
            <div className={'text-sm text-gray-500'}>
                {t('account.mfa_passkey_prompt', '请在浏览器弹出的窗口中完成 Passkey 认证')}
            </div>
            {renderSwitchButton()}
        </div>
    );

    // 渲染内容
    const renderContent = () => {
        if (showSelector) return renderSelector();

        switch (authType) {
            case 'none':
                return renderNoMFA();
            case 'otp':
                return renderOTP();
            case 'passkey':
                return error ? renderPasskeyError() : renderPasskeyPending();
            default:
                return null;
        }
    };

    return (
        <Modal
            title={t('account.mfa')}
            open={open}
            maskClosable={false}
            destroyOnHidden
            footer={null}
            onCancel={handleCancel}
        >
            <Spin tip={t('account.mfa_authing')} spinning={loading}>
                <div className={'min-h-72 w-full flex items-center justify-center py-4'}>
                    <div className={'space-y-4 w-full px-4'}>
                        {renderContent()}
                    </div>
                </div>
            </Spin>
        </Modal>
    );
};

export default MultiFactorAuthentication;
