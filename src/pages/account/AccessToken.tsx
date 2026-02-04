import React, {useState} from 'react';
import {Button, Form, Modal, Popconfirm, Select, Space, Table, Tag, Typography} from "antd";
import {useTranslation} from "react-i18next";
import {useMutation, useQuery} from "@tanstack/react-query";
import accountApi, {AccessTokenCreateResult, AccessTokenItem} from "@/api/account-api";
import times from "@/components/time/times";

const AccessToken = () => {
    let {t} = useTranslation();
    const [createdToken, setCreatedToken] = useState<AccessTokenCreateResult | null>(null);
    const [createType, setCreateType] = useState<string>('api');
    const [createModalOpen, setCreateModalOpen] = useState(false);

    let tokenQuery = useQuery({
        queryKey: ['access-token'],
        queryFn: accountApi.getAccessTokens,
    });

    let tokenMutation = useMutation({
        mutationFn: () => accountApi.createAccessToken(createType),
        onSuccess: (data) => {
            setCreateModalOpen(false);
            setCreatedToken(data);
            tokenQuery.refetch();
        }
    });

    let deleteMutation = useMutation({
        mutationFn: (id: string) => accountApi.deleteAccessToken(id),
        onSuccess: () => {
            tokenQuery.refetch();
        }
    });

    const tokenTypeLabel = (type: string) => {
        switch (type) {
            case 'api':
                return t('account.access_token_type_values.api');
            case 'db-password':
                return t('account.access_token_type_values.db_password');
            case 'session':
                return t('account.access_token_type_values.session');
            case 'temporary':
                return t('account.access_token_type_values.temporary');
            default:
                return type;
        }
    };

    const tokenTypeColor = (type: string) => {
        switch (type) {
            case 'api':
                return 'blue';
            case 'db-password':
                return 'gold';
            case 'session':
                return 'green';
            case 'temporary':
                return 'orange';
            default:
                return 'default';
        }
    };

    const columns = [
        {
            title: t('account.access_token'),
            dataIndex: 'token',
            render: (value: string) => <Typography.Text code>{value}</Typography.Text>
        },
        {
            title: t('account.access_token_type'),
            dataIndex: 'type',
            render: (value: string) => <Tag color={tokenTypeColor(value)}>{tokenTypeLabel(value)}</Tag>
        },
        {
            title: t('general.created_at'),
            dataIndex: 'createdAt',
            render: (value: number) => times.format(value)
        },
        {
            title: t('actions.label'),
            dataIndex: 'id',
            render: (_: string, record: AccessTokenItem) => (
                <Popconfirm
                    title={t('general.confirm_delete')}
                    onConfirm={() => deleteMutation.mutate(record.id)}
                    okText={t('actions.confirm')}
                    cancelText={t('actions.cancel')}
                >
                    <Button
                        type="link"
                        danger
                        loading={deleteMutation.isPending && deleteMutation.variables === record.id}
                    >
                        {t('actions.delete')}
                    </Button>
                </Popconfirm>
            )
        }
    ];

    return (
        <div className={'space-y-4'}>
            <div className={'flex items-center justify-between'}>
                <Typography.Title level={5} style={{marginTop: 0}}>{t('account.access_token')}</Typography.Title>
                <Button type="primary" onClick={() => setCreateModalOpen(true)}>
                    {t('account.access_token_create')}
                </Button>
            </div>

            <Table
                rowKey="id"
                columns={columns}
                dataSource={tokenQuery.data || []}
                loading={tokenQuery.isLoading}
                pagination={false}
            />

            <Modal
                open={!!createdToken}
                title={t('account.access_token')}
                onCancel={() => setCreatedToken(null)}
                onOk={() => setCreatedToken(null)}
                okText={t('actions.confirm')}
            >
                <Space direction="vertical" size={8}>
                    <Typography.Text type="secondary">{t('account.access_token_once_tip')}</Typography.Text>
                    <Typography.Text strong copyable>
                        {createdToken?.token}
                    </Typography.Text>
                </Space>
            </Modal>

            <Modal
                open={createModalOpen}
                title={t('account.access_token_create')}
                onCancel={() => setCreateModalOpen(false)}
                onOk={() => tokenMutation.mutate()}
                okText={t('actions.new')}
                confirmLoading={tokenMutation.isPending}
            >
                <Form layout="vertical">
                    <Form.Item label={t('account.access_token_type')}>
                        <Select
                            value={createType}
                            onChange={setCreateType}
                            options={[
                                {value: 'api', label: t('account.access_token_type_values.api')},
                                {value: 'db-password', label: t('account.access_token_type_values.db_password')}
                            ]}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default AccessToken;
