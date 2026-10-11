import {App, Button, Descriptions, Empty, Popconfirm, Space, Tag, Typography} from "antd";
import {useTranslation} from "react-i18next";
import {useMutation, useQuery} from "@tanstack/react-query";
import accountApi, {UserClientCertInfo} from "@/api/account-api";
import times from "@/components/time/times";

const ClientCertificate = () => {
    const {t} = useTranslation();
    const {message, modal} = App.useApp();

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
        modal.confirm({
            title: hasCert ? t('account.client_cert_regenerate') : t('account.client_cert_generate'),
            content: t('account.client_cert_once_tip'),
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
                        >
                            <Button danger loading={revokeMutation.isPending}>
                                {t('account.client_cert_revoke')}
                            </Button>
                        </Popconfirm>
                    )}
                </Space>
            </div>

            {cert ? (
                <Descriptions
                    column={1}
                    bordered
                    size="small"
                    items={[
                        {
                            key: 'serial',
                            label: t('account.client_cert_serial'),
                            children: <Typography.Text code>{cert.serialNumber}</Typography.Text>,
                        },
                        {
                            key: 'fingerprint',
                            label: t('account.client_cert_fingerprint'),
                            children: <Typography.Text code>{cert.fingerprint}</Typography.Text>,
                        },
                        {
                            key: 'status',
                            label: t('general.status'),
                            children: <Tag color={statusColor(cert.status)}>{statusLabel(cert.status)}</Tag>,
                        },
                        {
                            key: 'not-before',
                            label: t('account.client_cert_not_before'),
                            children: cert.notBefore ? times.format(cert.notBefore) : t('general.no'),
                        },
                        {
                            key: 'not-after',
                            label: t('account.client_cert_not_after'),
                            children: cert.notAfter ? times.format(cert.notAfter) : t('general.no'),
                        },
                        {
                            key: 'last-used',
                            label: t('account.client_cert_last_used'),
                            children: cert.lastUsedAt ? times.format(cert.lastUsedAt) : t('general.no'),
                        },
                        {
                            key: 'created-at',
                            label: t('general.created_at'),
                            children: cert.createdAt ? times.format(cert.createdAt) : t('general.no'),
                        },
                    ]}
                />
            ) : (
                <Empty description={t('account.client_cert_empty')}/>
            )}
        </div>
    );
};

export default ClientCertificate;
