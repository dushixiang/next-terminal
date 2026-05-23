import React, {useEffect, useState} from 'react';
import {Alert, Avatar, Button, Card, Space, Spin, Typography} from 'antd';
import {CheckCircleOutlined, CloseCircleOutlined, SafetyOutlined, UserOutlined} from '@ant-design/icons';
import {useNavigate, useSearchParams} from 'react-router-dom';
import accountApi, {AccountInfo, OAuthConsentPageData} from '@/api/account-api';
import {useTranslation} from "react-i18next";

const {Title, Text} = Typography;

const OAuthConsent: React.FC = () => {
    const {t} = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [data, setData] = useState<OAuthConsentPageData | null>(null);
    const [userInfo, setUserInfo] = useState<AccountInfo | null>(null);
    const [errorKey, setErrorKey] = useState<string | null>(null);

    const authorizeId = searchParams.get('authorize_id') || '';

    useEffect(() => {
        const load = async () => {
            try {
                if (!authorizeId) {
                    setErrorKey('account.oauth_consent.load_error');
                    setLoading(false);
                    return;
                }
                const [pageData, account] = await Promise.all([
                    accountApi.getOAuthConsentPage(authorizeId),
                    accountApi.getUserInfo(),
                ]);
                setData(pageData);
                setUserInfo(account);
            } catch (e) {
                console.error('Failed to load OAuth consent page:', e);
                setErrorKey('account.oauth_consent.load_error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [authorizeId]);

    const submit = async (approve: boolean) => {
        if (!authorizeId) return;
        setSubmitting(true);
        try {
            const result = await accountApi.submitOAuthConsent(authorizeId, approve);
            if (result && result.redirectUrl) {
                window.location.replace(result.redirectUrl);
            } else {
                navigate('/');
            }
        } catch (e) {
            console.error('OAuth consent submission failed:', e);
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen p-4">
                <Spin size="large" tip={t('general.loading')}/>
            </div>
        );
    }

    if (errorKey || !data) {
        return (
            <div className="flex justify-center items-center min-h-screen p-4">
                <Alert
                    title={t('general.error')}
                    description={errorKey ? t(errorKey) : t('account.oauth_consent.load_error')}
                    type="error"
                    showIcon
                    style={{maxWidth: 400, width: '100%'}}
                />
            </div>
        );
    }

    const callbackHost = (() => {
        try {
            return new URL(data.callback).host;
        } catch {
            return data.callback;
        }
    })();

    const renderScopeLabel = (key: string) => {
        switch (key) {
            case 'account.read':
                return t('account.oauth_consent.scope.account.read');
            case 'ssh_keys.manage':
                return t('account.oauth_consent.scope.ssh_keys.manage');
            case 'assets.read':
                return t('account.oauth_consent.scope.assets.read');
            case 'snippets.read':
                return t('account.oauth_consent.scope.snippets.read');
            case 'token.revoke_self':
                return t('account.oauth_consent.scope.token.revoke_self');
            default:
                return key;
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
            <Card
                className="w-full shadow-md"
                style={{maxWidth: 460}}
                styles={{body: {padding: '24px'}}}
            >
                <div className="text-center mb-5">
                    <Title level={3} className="mt-3 mb-1">
                        {t('account.oauth_consent.title')}
                    </Title>
                    <Text type="secondary" className="text-[13px]">
                        {t('account.oauth_consent.subtitle', {name: data.name})}
                    </Text>
                </div>

                <div className="flex flex-col gap-4">
                    {userInfo && (
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center gap-2.5">
                                <Avatar size={40} icon={<UserOutlined/>} className="bg-blue-500 flex-shrink-0"/>
                                <div className="flex-1 min-w-0">
                                    <Text type="secondary" className="text-xs block mb-0.5">
                                        {t('account.oidc_consent.current_account')}
                                    </Text>
                                    <Text strong className="text-sm block">
                                        {userInfo.nickname || userInfo.username}
                                    </Text>
                                </div>
                            </div>
                        </div>
                    )}

                    <Alert
                        title={
                            <span className="text-[13px]">
                                <strong>{data.name}</strong> {t('account.oauth_consent.request_access', {host: callbackHost})}
                            </span>
                        }
                        type="info"
                        showIcon
                    />

                    <div>
                        <Text strong className="block mb-3 text-sm">
                            {t('account.oauth_consent.requested_scopes')}
                        </Text>
                        <Space orientation="vertical" className="w-full" size={8}>
                            {data.scopes.map((scope) => (
                                <div key={scope.key} className="flex items-start gap-2 px-1">
                                    <SafetyOutlined className="text-blue-500 mt-1"/>
                                    <div className="text-[13px]">
                                        {renderScopeLabel(scope.key)}
                                    </div>
                                </div>
                            ))}
                        </Space>
                    </div>

                    <Alert
                        title={
                            <span className="text-xs">
                                {t('account.oauth_consent.warning', {name: data.name})}
                            </span>
                        }
                        type="warning"
                        showIcon={false}
                        className="px-3 py-2"
                    />

                    <Space className="w-full justify-end" size="middle">
                        <Button
                            icon={<CloseCircleOutlined/>}
                            onClick={() => submit(false)}
                            disabled={submitting}
                        >
                            {t('account.oauth_consent.deny')}
                        </Button>
                        <Button
                            type="primary"
                            icon={<CheckCircleOutlined/>}
                            onClick={() => submit(true)}
                            loading={submitting}
                        >
                            {t('account.oauth_consent.allow')}
                        </Button>
                    </Space>
                </div>
            </Card>
        </div>
    );
};

export default OAuthConsent;
