import React from "react";
import {Button, Descriptions, Empty, Popconfirm, Space, Tag, Typography} from "antd";
import {useTranslation} from "react-i18next";
import {useMutation, useQuery} from "@tanstack/react-query";
import userApi, {UserClientCertInfo} from "@/api/user-api";
import times from "@/components/time/times";

interface UserClientCertProps {
    active: boolean;
    userId: string;
}

const UserClientCert = ({active, userId}: UserClientCertProps) => {
    const {t} = useTranslation();

    const certQuery = useQuery({
        queryKey: ['user-client-cert', userId],
        queryFn: () => userApi.getUserClientCert(userId),
        enabled: active,
    });

    const revokeMutation = useMutation({
        mutationFn: () => userApi.revokeUserClientCert(userId),
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

    const cert = certQuery.data as UserClientCertInfo | null;

    return (
        <div className={'space-y-4'}>
            <div className={'flex items-center justify-between'}>
                <Typography.Title level={5} style={{marginTop: 0}}>{t('account.client_cert')}</Typography.Title>
                {cert && (
                    <Space>
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
                    </Space>
                )}
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

export default UserClientCert;
