import React, {useEffect, useRef, useState} from 'react';
import {Button, Input, Modal, Result, Space, Spin, Typography} from "antd";
import accountApi, {AuthType, VerificationChallenge} from "@/api/account-api";
import {startAuthentication} from "@simplewebauthn/browser";
import {useMutation, useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {KeyOutlined, SafetyOutlined, MailOutlined, MobileOutlined, RightOutlined} from "@ant-design/icons";

import {useVerificationCountdown} from './use-verification-countdown';

interface Props {
    open: boolean
    handleOk: (securityToken: string) => void
    handleCancel: () => void
    forceReauth?: boolean
}

interface Error {
    code?: number | string
    message?: string
}

const MultiFactorAuthentication = ({open, handleOk, handleCancel, forceReauth = false}: Props) => {
    const {t} = useTranslation();

    const openRef = useRef(open);
    openRef.current = open;
    useEffect(() => () => {openRef.current = false;}, []);
    const [deliveryChallenge, setDeliveryChallenge] = useState<VerificationChallenge>();
    const [retryUntil, setRetryUntil] = useState(0);
    const retrySeconds = useVerificationCountdown(retryUntil);
    const [authType, setAuthType] = useState<AuthType>('');
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(false);
    const [otpValue, setOtpValue] = useState('');
    const [showSelector, setShowSelector] = useState(false);
    const [otpKey, setOtpKey] = useState(0); // 用于强制重新挂载 InputOTP

    // 查询支持的认证类型
    const {data: supportedAuthTypes = [], isPending: supportLoading, isError: supportError, refetch: refetchSupport} = useQuery({
        queryKey: ['securityTokenSupportTypes'],
        queryFn: accountApi.getSecurityTokenSupportTypes,
        enabled: open,
    });

    // 认证类型配置
    const authTypeConfigs: {key: Exclude<AuthType, '' | 'none'>; icon: React.ReactNode; title: string; description: string}[] = [
        {
            key: 'passkey' as const,
            icon: <SafetyOutlined style={{fontSize: 22}}/>,
            title: t('account.passkey'),
            description: t('account.auth_type_passkey_desc'),
        },
        {
            key: 'otp' as const,
            icon: <KeyOutlined style={{fontSize: 22}}/>,
            title: t('account.auth_type_otp'),
            description: t('account.auth_type_otp_desc'),
        },
        {key: 'email', icon: <MailOutlined style={{fontSize: 22}}/>, title: t('account.verification.email'), description: t('account.verification.email_desc')},
        {key: 'sms', icon: <MobileOutlined style={{fontSize: 22}}/>, title: t('account.verification.sms'), description: t('account.verification.sms_desc')},
    ];

    // 重置状态
    const resetState = () => {
        setError(null);
        setLoading(false);
        setOtpValue('');
        setShowSelector(false);
        setAuthType('');
        setDeliveryChallenge(undefined);
        setRetryUntil(0);
    };

    // 清除输入
    const clearInputs = () => {
        setError(null);
        setOtpValue('');
    };

    // 处理认证类型切换
    const handleAuthTypeChange = (type: AuthType) => {
        clearInputs();
        setDeliveryChallenge(undefined);
        setAuthType(type);
        setShowSelector(false);
    };

    const storeSecurityToken = (securityToken: string) => {
        if (!openRef.current) return;
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

    const sendDeliveryCode = useMutation({
        mutationFn: () => accountApi.sendVerificationCode({channel: authType === 'email' ? 'email' : 'sms', purpose: 'mfa'}),
        onSuccess: challenge => {
            if (!openRef.current) return;
            setDeliveryChallenge(challenge);
            setRetryUntil(Date.now() + challenge.retryAfter * 1000);
            setOtpValue('');
            setError(null);
        },
        onError: (e: Error) => setError(e),
    });
    const verifyDeliveryCode = useMutation({
        mutationFn: (code: string) => accountApi.verifyAccountCode({challengeId: deliveryChallenge!.challengeId, purpose: 'mfa', code}),
        onSuccess: result => result.token && storeSecurityToken(result.token),
        onError: (e: Error) => {setError(e); setOtpValue(''); setOtpKey(key => key + 1);},
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

        if (supportLoading || supportError) return;

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
    }, [open, supportedAuthTypes, authType, supportLoading, supportError]);

    // Passkey 自动认证
    useEffect(() => {
        if (authType === 'passkey' && !showSelector && open) {
            authenticateWithPasskey();
        }
    }, [authType, showSelector, open]);

    useEffect(() => {
        if (open && !forceReauth) {
            // 检查是否有存储的 securityToken
            validateSecurityToken();
        }
    }, [open, forceReauth]);

    // 渲染选择器
    const renderSelector = () => (
        <div className="flex flex-col gap-2">
            {authTypeConfigs.filter(config => supportedAuthTypes.includes(config.key)).map(config => (
                <Button
                    key={config.key}
                    block
                    onClick={() => handleAuthTypeChange(config.key)}
                    style={{height: 'auto', padding: '14px 16px', whiteSpace: 'normal', textAlign: 'left'}}
                >
                    <div className="flex w-full items-center gap-3">
                        {config.icon}
                        <div className="min-w-0 flex-1">
                            <div className="font-medium">{config.title}</div>
                            <Typography.Text type="secondary" className="text-sm">
                                {config.description}
                            </Typography.Text>
                        </div>
                        <RightOutlined style={{fontSize: 12}}/>
                    </div>
                </Button>
            ))}
        </div>
    );

    // 渲染切换按钮
    const renderSwitchButton = () =>
        supportedAuthTypes.length > 1 && (
            <div className={'text-center'}>
                <Button type="link" disabled={sendDeliveryCode.isPending || verifyDeliveryCode.isPending || validateOTP.isPending} onClick={() => setShowSelector(true)}>
                    {t('account.mfa_change_way')}
                </Button>
            </div>
        );

    // 渲染错误提示
    const renderError = () => {
        if (!error) {
            return null;
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
            <div className="text-sm" role="alert">
                {content && <Typography.Text type="danger">{content}</Typography.Text>}
            </div>
        );
    };


    // 渲染未配置提示
    const renderNoMFA = () => (
        <Result
            title={t('account.no_mfa_title')}
            subTitle={t('account.no_mfa_subtitle')}
            extra={
                <Space wrap>
                    <Button onClick={() => window.location.href = window.location.pathname.startsWith('/x-') ? '/x-info' : '/info'}>{t('account.profile')}</Button>
                    <Button
                        color="geekblue"
                        variant={'filled'}
                        onClick={() => window.location.href = `${window.location.pathname.startsWith('/x-') ? '/x-info' : '/info'}?activeKey=otp`}
                    >
                        {t('account.enable_otp')}
                    </Button>
                    <Button
                        color="green"
                        variant={'filled'}
                        onClick={() => window.location.href = `${window.location.pathname.startsWith('/x-') ? '/x-info' : '/info'}?activeKey=passkey`}
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
            <div className="space-y-4 text-center">
                <div className="font-medium">{t('account.auth_type_otp')}</div>
                <Input.OTP
                    key={otpKey}
                    length={6}
                    autoFocus
                    value={otpValue}
                    onChange={(value) => {
                        setOtpValue(value);
                        setError(null);
                        if (value.length === 6) {
                            handleOTPComplete(value);
                        }
                    }}
                    disabled={validateOTP.isPending}
                />
                {renderError()}
                {renderSwitchButton()}
            </div>
        </div>
    );

    const renderDelivery = () => <div className="space-y-4 text-center">
        <div className="font-medium">{t(authType === 'email' ? 'account.verification.email' : 'account.verification.sms')}</div>
        {deliveryChallenge && <div><Typography.Text type="secondary">{t('account.verification.sent_to', {destination: deliveryChallenge.destination, minutes: deliveryChallenge.expiresIn / 60})}</Typography.Text></div>}
        <Button type={deliveryChallenge ? "default" : "primary"} onClick={() => sendDeliveryCode.mutate()} loading={sendDeliveryCode.isPending}
            disabled={retrySeconds > 0 || verifyDeliveryCode.isPending}>
            {retrySeconds > 0 ? t('account.verification.resend_after', {seconds: retrySeconds}) : t('account.verification.send_code')}
        </Button>
        {deliveryChallenge && <div><Input.OTP key={otpKey} length={6} value={otpValue}
            disabled={verifyDeliveryCode.isPending || sendDeliveryCode.isPending}
            onChange={value => {setOtpValue(value); setError(null); if (/^\d{6}$/.test(value)) verifyDeliveryCode.mutate(value);}}/></div>}
        {renderError()}
        {renderSwitchButton()}
    </div>;

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
                        {t('actions.retry')}
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
            <div className="text-sm"><Typography.Text type="secondary">
                {t('account.mfa_passkey_prompt')}
            </Typography.Text></div>
            {renderSwitchButton()}
        </div>
    );

    // 渲染内容
    const renderContent = () => {
        if (supportLoading) return <Spin/>;
        if (supportError) return <Result status="error" title={t('account.verification.load_failed')} extra={<Button onClick={() => void refetchSupport()}>{t('actions.retry')}</Button>}/>;
        if (showSelector) return renderSelector();

        switch (authType) {
            case 'none':
                return renderNoMFA();
            case 'email':
            case 'sms':
                return renderDelivery();
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
            width={440}
            mask={{closable: false}}
            destroyOnHidden
            footer={null}
            onCancel={handleCancel}
        >
            <Spin description={t('account.mfa_authing')} spinning={loading}>
                <div className="w-full py-4">
                    {renderContent()}
                </div>
            </Spin>
        </Modal>
    );
};

export default MultiFactorAuthentication;
