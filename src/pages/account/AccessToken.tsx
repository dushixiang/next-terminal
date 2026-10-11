import {useNavigate} from 'react-router-dom';
import {agentAccessSettingUrl, canAccessAgentSettings} from '@/utils/agent-access';
import {useState} from 'react';
import {Alert, Button, DatePicker, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography} from "antd";
import dayjs, {type Dayjs} from "dayjs";
import {useTranslation} from "react-i18next";
import {useMutation, useQuery} from "@tanstack/react-query";
import accountApi, {AccessTokenCreateResult, AccessTokenItem} from "@/api/account-api";
import times from "@/components/time/times";

const AccessToken = () => {
    const navigate = useNavigate();
    let {t} = useTranslation();
    const [form] = Form.useForm<{ name: string; type: string; expiresAt?: Dayjs }>();
    const [editForm] = Form.useForm<{ name: string }>();
    const [editingToken, setEditingToken] = useState<AccessTokenItem | null>(null);
    const [createdToken, setCreatedToken] = useState<AccessTokenCreateResult | null>(null);
    const [createModalOpen, setCreateModalOpen] = useState(false);

    const infoQuery = useQuery({queryKey: ['info'], queryFn: accountApi.getUserInfo});
    const apiKeyAccessEnabled = infoQuery.data?.apiKeyAccessEnabled === true;

    let tokenQuery = useQuery({
        queryKey: ['access-token'],
        queryFn: accountApi.getAccessTokens,
    });

    let tokenMutation = useMutation({
        mutationFn: (values: { name: string; type: string; expiresAt?: Dayjs }) =>
            accountApi.createAccessToken(values.name.trim(), values.type, values.expiresAt?.valueOf()),
        onSuccess: (data) => {
            setCreateModalOpen(false);
            form.resetFields();
            setCreatedToken(data);
            tokenQuery.refetch();
        }
    });

    const updateMutation = useMutation({
        mutationFn: (values: { id: string; name: string }) => accountApi.updateAccessToken(values.id, values.name.trim()),
        onSuccess: () => {
            setEditingToken(null);
            editForm.resetFields();
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
            case 'oauth':
                return t('account.access_token_type_values.oauth');
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
            case 'oauth':
                return 'purple';
            default:
                return 'default';
        }
    };

    const columns = [
        {
            title: t('general.name'),
            dataIndex: 'name',
            render: (value?: string) => value || '—',
        },
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
            title: t('account.access_token_source'),
            dataIndex: 'sourceName',
            render: (_: string, record: AccessTokenItem) => (
                record.sourceName
                    ? record.sourceName
                    : <Typography.Text type="secondary">{t('account.access_token_source_manual')}</Typography.Text>
            )
        },
        {
            title: t('account.access_token_expires_at'),
            dataIndex: 'expiresAt',
            render: (value?: number) => (
                value ? times.format(value) :
                    <Typography.Text type="secondary">{t('account.access_token_expires_never')}</Typography.Text>
            )
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
                <Space>
                    <Button
                        type="link"
                        style={{padding: 0, margin: 0}}
                        onClick={() => {
                            editForm.setFieldsValue({name: record.name || ''});
                            setEditingToken(record);
                        }}
                    >
                        {t('actions.edit')}
                    </Button>
                    <Popconfirm
                        title={t('general.confirm_delete')}
                        onConfirm={() => deleteMutation.mutate(record.id)}
                    >
                        <Button
                            type="link"
                            danger
                            style={{padding: 0, margin: 0}}
                            loading={deleteMutation.isPending && deleteMutation.variables === record.id}
                        >
                            {t('actions.delete')}
                        </Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div className={'space-y-4'}>
            {infoQuery.data && !apiKeyAccessEnabled && <div><Alert type="info" showIcon title={t('agent_access.disabled')} description={t('agent_access.key_disabled_tip')} action={canAccessAgentSettings(infoQuery.data, 'GET') ? <Button onClick={() => navigate(agentAccessSettingUrl)}>{t(canAccessAgentSettings(infoQuery.data, 'PUT') ? 'agent_access.go_settings' : 'agent_access.view_settings')}</Button> : undefined}/></div>}
            <div className={'flex items-center justify-between'}>
                <Typography.Title level={5} style={{marginTop: 0}}>{t('account.access_token')}</Typography.Title>
                <Button
                    type="primary"
                    disabled={infoQuery.isPending || infoQuery.isError}
                    onClick={() => {
                        form.setFieldsValue({type: apiKeyAccessEnabled ? 'api' : 'db-password'});
                        setCreateModalOpen(true);
                    }}
                >
                    {t('account.access_token_create')}
                </Button>
            </div>

            <Table
                rowKey="id"
                size="small"
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
            >
                <Space orientation="vertical" size={8}>
                    <Typography.Text type="secondary">{t('account.access_token_once_tip')}</Typography.Text>
                    <Typography.Text strong copyable>
                        {createdToken?.token}
                    </Typography.Text>
                </Space>
            </Modal>

            <Modal
                open={createModalOpen}
                title={t('account.access_token_create')}
                onCancel={() => {
                    setCreateModalOpen(false);
                    form.resetFields();
                }}
                onOk={() => form.submit()}
                okText={t('actions.new')}
                confirmLoading={tokenMutation.isPending}
            >
                <Form form={form} layout="vertical" initialValues={{type: 'api'}}
                      onFinish={values => {
                          if (values.type !== 'api' || apiKeyAccessEnabled) {
                              tokenMutation.mutate(values);
                          }
                      }}>
                    <Form.Item
                        name="name"
                        label={t('general.name')}
                        rules={[{required: true, whitespace: true, message: t('account.access_token_name_required')}]}
                    >
                        <Input/>
                    </Form.Item>
                    <Form.Item name="type" label={t('account.access_token_type')}>
                        <Select
                            options={[
                                {value: 'api', label: t('account.access_token_type_values.api'), disabled: !apiKeyAccessEnabled},
                                {value: 'db-password', label: t('account.access_token_type_values.db_password')}
                            ]}
                        />
                    </Form.Item>
                    <Form.Item
                        name="expiresAt"
                        label={t('account.access_token_expires_at')}
                        extra={t('account.access_token_expires_never')}
                        rules={[{
                            validator: (_, value?: Dayjs) =>
                                !value || value.isAfter(dayjs())
                                    ? Promise.resolve()
                                    : Promise.reject(new Error(t('account.access_token_expires_future')))
                        }]}
                    >
                        <DatePicker
                            showTime
                            format="YYYY-MM-DD HH:mm:ss"
                            style={{width: '100%'}}
                            disabledDate={date => date.isBefore(dayjs(), 'day')}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                open={!!editingToken}
                title={t('account.access_token_edit_name')}
                onCancel={() => {
                    setEditingToken(null);
                    editForm.resetFields();
                }}
                onOk={() => editForm.submit()}
                confirmLoading={updateMutation.isPending}
            >
                <Form form={editForm} layout="vertical" onFinish={values => {
                    if (editingToken) {
                        updateMutation.mutate({id: editingToken.id, name: values.name});
                    }
                }}>
                    <Form.Item
                        name="name"
                        label={t('general.name')}
                        rules={[{required: true, whitespace: true, message: t('account.access_token_name_required')}]}
                    >
                        <Input/>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default AccessToken;
