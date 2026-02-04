import React from 'react';
import {Button, Descriptions, Empty, Modal, Popconfirm, Space, Tag, Typography, message} from "antd";
import {useTranslation} from "react-i18next";
import {useMutation, useQuery} from "@tanstack/react-query";
import accountApi, {UserClientCertInfo} from "@/api/account-api";
import times from "@/components/time/times";

const ClientCertificate = () => {
    const {t} = useTranslation();

    const certQuery = useQuery({
        queryKey: ['client-cert'],
        queryFn: accountApi.getClientCert,
    });

    const revokeMutation = useMutation({
        mutationFn: accountApi.revokeClientCert,
        onSuccess: () => {
            certQuery.refetch();
        }
    });

    const statusLabel = (status: string) => {
        if (status === 'active') {
            return t('account.client_cert_status_active');
        }
        return t('account.client_cert_status_revoked');
    };

    const statusColor = (status: string) => {
        if (status === 'active') {
            return 'green';
        }
        return 'red';
    };

    const handleGenerate = () => {
        const hasCert = !!certQuery.data;
        Modal.confirm({
            title: hasCert ? t('account.client_cert_regenerate') : t('account.client_cert_generate'),
            content: t('account.client_cert_once_tip'),
            okText: t('actions.confirm'),
            cancelText: t('actions.cancel'),
            onOk: async () => {
                accountApi.downloadClientCert();
                message.success(t('account.client_cert_download_started'));
                setTimeout(() => certQuery.refetch(), 800);
            }
        });
    };

    const cert = certQuery.data as UserClientCertInfo | null;

    return (
        <div className={'space-y-4'}>
            <div className={'flex items-center justify-between'}>
                <Typography.Title level={5} style={{marginTop: 0}}>{t('account.client_cert')}</Typography.Title>
                <Space>
                    <Button type="primary" onClick={handleGenerate}>
                        {cert ? t('account.client_cert_regenerate') : t('account.client_cert_generate')}
                    </Button>
                    {cert && (
                        <Popconfirm
                            title={t('account.client_cert_revoke_confirm')}
                            onConfirm={() => revokeMutation.mutate()}
                            okText={t('actions.confirm')}
                            cancelText={t('actions.cancel')}
                        >
                            <Button danger loading={revokeMutation.isPending}>
                                {t('account.client_cert_revoke')}
                            </Button>
                        </Popconfirm>
                    )}
                </Space>
            </div>

            {cert ? (
                <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label={t('account.client_cert_serial')}>
                        <Typography.Text code>{cert.serialNumber}</Typography.Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={t('account.client_cert_fingerprint')}>
                        <Typography.Text code>{cert.fingerprint}</Typography.Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={t('general.status')}>
                        <Tag color={statusColor(cert.status)}>{statusLabel(cert.status)}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label={t('account.client_cert_not_before')}>
                        {cert.notBefore ? times.format(cert.notBefore) : t('general.no')}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('account.client_cert_not_after')}>
                        {cert.notAfter ? times.format(cert.notAfter) : t('general.no')}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('account.client_cert_last_used')}>
                        {cert.lastUsedAt ? times.format(cert.lastUsedAt) : t('general.no')}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('general.created_at')}>
                        {cert.createdAt ? times.format(cert.createdAt) : t('general.no')}
                    </Descriptions.Item>
                </Descriptions>
            ) : (
                <Empty description={t('account.client_cert_empty')}/>
            )}
        </div>
    );
};

export default ClientCertificate;
