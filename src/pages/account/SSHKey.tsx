import React, {useState} from 'react';
import {App, Button, Empty, Form, Input, Modal, Table, Tag, Typography} from "antd";
import {useMutation, useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import accountApi, {AccountSSHKeyItem} from "@/api/account-api";
import times from "@/components/time/times";
import MultiFactorAuthentication from "@/pages/account/MultiFactorAuthentication";

type MFAAction = 'create' | 'delete' | null;

interface CreateSSHKeyForm {
    name?: string;
    publicKey: string;
}

const SSHKey = () => {
    const {t} = useTranslation();
    const {message, modal} = App.useApp();
    const [form] = Form.useForm<CreateSSHKeyForm>();
    const [createOpen, setCreateOpen] = useState(false);
    const [mfaOpen, setMfaOpen] = useState(false);
    const [mfaAction, setMfaAction] = useState<MFAAction>(null);
    const [pendingCreate, setPendingCreate] = useState<CreateSSHKeyForm | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<AccountSSHKeyItem | null>(null);

    const sshKeyQuery = useQuery({
        queryKey: ['account-ssh-keys'],
        queryFn: accountApi.getSSHKeys,
    });

    const createMutation = useMutation({
        mutationFn: (values: CreateSSHKeyForm & { securityToken?: string }) => accountApi.createSSHKey(values),
        onSuccess: () => {
            sshKeyQuery.refetch();
            message.success(t('general.success'));
        }
    });

    const deleteMutation = useMutation({
        mutationFn: ({id, securityToken}: { id: string; securityToken?: string }) =>
            accountApi.deleteSSHKey(id, securityToken),
        onSuccess: () => {
            sshKeyQuery.refetch();
            message.success(t('general.success'));
        }
    });

    const resetMfaState = () => {
        setMfaOpen(false);
        setMfaAction(null);
        setPendingCreate(null);
        setDeleteTarget(null);
    };

    const openCreateModal = () => {
        form.resetFields();
        setCreateOpen(true);
    };

    const handleCreateSubmit = async () => {
        const values = await form.validateFields();
        setPendingCreate(values);
        setCreateOpen(false);
        setMfaAction('create');
        setMfaOpen(true);
    };

    const handleDelete = async (item: AccountSSHKeyItem) => {
        const confirmed = await modal.confirm({
            title: t('account.ssh_key_delete_title'),
            content: t('account.ssh_key_delete_content', {name: item.name}),
        });
        if (!confirmed) {
            return;
        }
        setDeleteTarget(item);
        setMfaAction('delete');
        setMfaOpen(true);
    };

    const handleMfaOk = async (securityToken: string) => {
        try {
            if (mfaAction === 'create' && pendingCreate) {
                await createMutation.mutateAsync({
                    ...pendingCreate,
                    securityToken,
                });
            }
            if (mfaAction === 'delete' && deleteTarget) {
                await deleteMutation.mutateAsync({
                    id: deleteTarget.id,
                    securityToken,
                });
            }
        } finally {
            resetMfaState();
        }
    };

    const columns = [
        {
            title: t('account.ssh_key_name'),
            dataIndex: 'name',
            ellipsis: true,
        },
        {
            title: t('account.ssh_key_algorithm'),
            dataIndex: 'algorithm',
            render: (value: string) => <Tag color="blue">{value}</Tag>,
            width: 120,
        },
        {
            title: t('account.ssh_key_fingerprint'),
            dataIndex: 'fingerprint',
            render: (value: string) => (
                <Typography.Text copyable={{text: value}} code>
                    {value}
                </Typography.Text>
            )
        },
        {
            title: t('identity.user.public_key'),
            dataIndex: 'publicKey',
            render: (value: string) => (
                <Typography.Text copyable={{text: value}} ellipsis style={{maxWidth: 240}}>
                    {value}
                </Typography.Text>
            )
        },
        {
            title: t('account.ssh_key_comment'),
            dataIndex: 'comment',
            render: (value: string) => value || '-',
            ellipsis: true,
        },
        {
            title: t('account.ssh_key_last_used'),
            dataIndex: 'lastUsedAt',
            render: (value: number) => value ? times.format(value) : t('general.no'),
        },
        {
            title: t('general.created_at'),
            dataIndex: 'createdAt',
            render: (value: number) => times.format(value),
            width: 190,
        },
        {
            title: t('actions.label'),
            dataIndex: 'id',
            render: (_: string, record: AccountSSHKeyItem) => (
                <Button
                    type="link"
                    danger
                    loading={deleteMutation.isPending && deleteMutation.variables?.id === record.id}
                    onClick={() => handleDelete(record)}
                >
                    {t('actions.delete')}
                </Button>
            ),
            width: 100,
        }
    ];

    const loading = sshKeyQuery.isLoading || createMutation.isPending;

    return (
        <div className={'space-y-4'}>
            <div className={'flex items-center justify-between'}>
                <div className={'space-y-1'}>
                    <Typography.Title level={5} style={{marginTop: 0}}>{t('account.ssh_key')}</Typography.Title>
                    <Typography.Text type="secondary">
                        {t('account.ssh_key_desc')}
                    </Typography.Text>
                </div>
                <Button type="primary" onClick={openCreateModal} loading={loading}>
                    {t('account.ssh_key_add')}
                </Button>
            </div>

            {sshKeyQuery.data && sshKeyQuery.data.length > 0 ? (
                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={sshKeyQuery.data}
                    loading={sshKeyQuery.isLoading}
                    pagination={false}
                    scroll={{x: 1100}}
                />
            ) : (
                <Empty description={t('account.ssh_key_empty')}/>
            )}

            <Modal
                open={createOpen}
                title={t('account.ssh_key_add')}
                onCancel={() => setCreateOpen(false)}
                onOk={handleCreateSubmit}
                okText={t('actions.confirm')}
                cancelText={t('actions.cancel')}
                confirmLoading={createMutation.isPending}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="name"
                        label={t('account.ssh_key_name')}
                        tooltip={t('account.ssh_key_name_tip')}
                    >
                        <Input placeholder={t('account.ssh_key_name_placeholder')}/>
                    </Form.Item>
                    <Form.Item
                        name="publicKey"
                        label={t('identity.user.public_key')}
                        extra={t('account.ssh_key_public_key_tip')}
                        rules={[{required: true, message: t('account.ssh_key_public_key_required')}]}
                    >
                        <Input.TextArea
                            rows={6}
                            placeholder={t('account.ssh_key_public_key_placeholder')}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            <MultiFactorAuthentication
                open={mfaOpen}
                forceReauth
                handleOk={handleMfaOk}
                handleCancel={resetMfaState}
            />
        </div>
    );
};

export default SSHKey;
