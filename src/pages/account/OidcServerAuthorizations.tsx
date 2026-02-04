import React from 'react';
import {useMutation, useQuery} from "@tanstack/react-query";
import accountApi, {OidcUserConsentItem} from "@/api/account-api";
import {App, Button, Empty, List, Space, Tag, Typography} from "antd";
import {KeyIcon, Trash2Icon} from "lucide-react";
import dayjs from "dayjs";
import {useTranslation} from "react-i18next";

const OidcServerAuthorizations = () => {
    const {t} = useTranslation();
    let {message, modal} = App.useApp();

    // 获取授权列表
    let consentsQuery = useQuery({
        queryKey: ['oidc-server-consents'],
        queryFn: accountApi.getOidcServerConsents,
    });

    // 撤销授权
    let revokeMutation = useMutation({
        mutationFn: accountApi.revokeOidcServerConsent,
        onSuccess: () => {
            consentsQuery.refetch();
            message.success(t('account.oidc_server_authorization_revoked'));
        },
        onError: () => {
            message.error(t('general.failed'));
        }
    });

    const handleRevoke = async (item: OidcUserConsentItem) => {
        const confirmed = await modal.confirm({
            title: t('account.oidc_server_authorization_revoke_title'),
            content: t('account.oidc_server_authorization_revoke_content', {clientId: item.clientId}),
        });
        if (confirmed) {
            revokeMutation.mutate(item.clientId);
        }
    };

    const renderScopes = (scopes: string[]) => {
        return (
            <Space wrap>
                {scopes.map(scope => (
                    <Tag key={scope} color="blue">{scope}</Tag>
                ))}
            </Space>
        );
    };

    return (
        <div className={''}>
            <div className={'flex items-center justify-between'}>
                <Typography.Title level={5} style={{marginTop: 0}}>
                    {t('account.oidc_server_authorizations')}
                </Typography.Title>
            </div>

            <div className={'text-gray-700'}>
                {t('account.oidc_server_authorizations_desc')}
            </div>

            <div className={'mt-4'}>
                {consentsQuery.data?.length === 0 ? (
                    <Empty
                        description={t('account.oidc_server_no_authorizations')}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                ) : (
                    <List
                        itemLayout="horizontal"
                        dataSource={consentsQuery.data}
                        loading={consentsQuery.isLoading}
                        renderItem={(item) => (
                            <div className={'border rounded-md p-4 flex items-center justify-between mb-2'}>
                                <div className={'space-y-2 flex-1'}>
                                    <div className={'flex items-center gap-4'}>
                                        <KeyIcon className={'h-4 w-4'}/>
                                        <div className={'font-medium text-base'}>{item.clientId}</div>
                                    </div>

                                    <div className={'ml-8 space-y-2'}>
                                        <div>
                                            <span className={'text-gray-500'}>{t('account.oidc_server_scopes')}：</span>
                                            {renderScopes(item.scopes)}
                                        </div>
                                        <div className={'text-sm text-gray-500'}>
                                            {t('authorised.label.authorised_at')}：{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                                        </div>
                                        <div className={'text-sm text-gray-500'}>
                                            {t('general.updated_at')}：{dayjs(item.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
                                        </div>
                                    </div>
                                </div>

                                <div className={'flex items-center'}>
                                    <Button
                                        danger
                                        icon={<Trash2Icon className={'h-4 w-4'}/>}
                                        onClick={() => handleRevoke(item)}
                                        loading={revokeMutation.isPending}
                                    >
                                        {t('account.oidc_server_revoke')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    />
                )}
            </div>
        </div>
    );
};

export default OidcServerAuthorizations;
