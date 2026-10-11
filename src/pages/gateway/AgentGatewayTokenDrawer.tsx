import {useState} from 'react';
import {App, Button, Drawer, Form, Input, Modal, Popconfirm, Table, TableProps, Typography} from "antd";
import {useTranslation} from "react-i18next";
import {useMutation, useQuery} from "@tanstack/react-query";
import agentGatewayTokenApi, {AgentGatewayToken} from "@/api/agent-gateway-token-api";
import dayjs from "dayjs";
import NButton from "@/components/NButton";

interface Props {
    open: boolean;
    onClose: () => void;
}

const {Paragraph} = Typography;

const AgentGatewayTokenDrawer = ({open, onClose}: Props) => {

    let {t} = useTranslation();
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingToken, setEditingToken] = useState<AgentGatewayToken | null>(null);
    let {message} = App.useApp();

    let tokenQuery = useQuery({
        queryKey: ['agent-gateway-tokens'],
        queryFn: agentGatewayTokenApi.getAll,
        enabled: open,
    });

    const createMutation = useMutation({
        mutationFn: (values: {remark: string}) => agentGatewayTokenApi.create({
                remark: values.remark,
            } as AgentGatewayToken),
        onSuccess: () => {
            message.success(t('general.success'));
            setCreateModalOpen(false);
            form.resetFields();
            tokenQuery.refetch();
        },
        onError: () => message.error(t('general.error')),
    });

    const editMutation = useMutation({
        mutationFn: (values: {remark: string}) => {
            if (!editingToken) {
                throw new Error('Missing token');
            }
            const updatedToken = {
                ...editingToken,
                remark: values.remark,
            };
            return agentGatewayTokenApi.updateById(editingToken.id, updatedToken);
        },
        onSuccess: () => {
            message.success(t('general.success'));
            setEditModalOpen(false);
            setEditingToken(null);
            editForm.resetFields();
            tokenQuery.refetch();
        },
        onError: () => message.error(t('general.error')),
    });

    const deleteMutation = useMutation({
        mutationFn: agentGatewayTokenApi.deleteById,
        onSuccess: () => tokenQuery.refetch(),
        onError: () => message.error(t('general.error')),
    });

    const openEditModal = (token: AgentGatewayToken) => {
        setEditingToken(token);
        editForm.setFieldsValue({
            remark: token.remark,
        });
        setEditModalOpen(true);
    };

    const columns: TableProps<AgentGatewayToken>['columns'] = [
        {
            title: t('gateways.token'),
            dataIndex: 'id',
            key: 'id',
            render: (text, record) => {
                return (
                    <div className="flex flex-col gap-2">
                        <Paragraph
                            copyable
                            style={{marginBottom: 0}}
                            className="font-mono text-sm"
                        >
                            {text}
                        </Paragraph>
                        {record.remark && (
                            <div
                                className="px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400 border-l-2 border-blue-200 dark:border-blue-700">
                                <span
                                    className="font-medium text-gray-700 dark:text-gray-300">{t('general.remark_label')}</span>
                                {record.remark}
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            title: t('general.updated_at'),
            dataIndex: 'updatedAt',
            key: 'updatedAt',
            width: 191,
            render: (text) => {
                return dayjs(text).format('YYYY-MM-DD HH:mm:ss')
            }
        },
        {
            title: t('actions.label'),
            key: 'action',
            width: 150,
            render: (_, record) => (
                <div style={{display: 'flex', gap: '8px'}}>
                    <Button
                        type="link"
                        size="small"
                        onClick={() => openEditModal(record)}
                    >
                        {t('actions.edit')}
                    </Button>
                    <Popconfirm
                        key={'delete-confirm'}
                        title={t('general.confirm_delete')}
                        onConfirm={() => deleteMutation.mutate(record.id)}
                    >
                        <NButton key='delete' danger={true}>{t('actions.delete')}</NButton>
                    </Popconfirm>
                </div>
            ),
        },
    ];

    return (
        <>
            <Drawer
                title={t('gateways.token_manage')}
                onClose={onClose}
                open={open}
                size="min(90vw, 960px)"
                extra={
                    <Button
                        type="primary"
                        onClick={() => setCreateModalOpen(true)}
                    >
                        {t('actions.new')}
                    </Button>
                }
            >
                <Paragraph type="secondary">{t('gateways.token_tip')}</Paragraph>
                <Table<AgentGatewayToken>
                    columns={columns}
                    dataSource={tokenQuery.data}
                    loading={tokenQuery.isFetching || deleteMutation.isPending}
                    pagination={false}
                    rowKey="id"
                />
            </Drawer>

            {/* 新增令牌模态框 */}
            <Modal
                title={t('gateways.add_token')}
                open={createModalOpen}
                confirmLoading={createMutation.isPending}
                onOk={() => form.submit()}
                onCancel={() => {
                    setCreateModalOpen(false);
                    form.resetFields();
                }}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={(values) => createMutation.mutate(values)}
                >
                    <Form.Item
                        label={t('general.remark')}
                        name="remark"
                        rules={[
                            {
                                required: true,
                                message: t('general.required'),
                            },
                        ]}
                    >
                        <Input placeholder={t('general.enter_remark')}/>
                    </Form.Item>
                </Form>
            </Modal>

            {/* 修改令牌备注模态框 */}
            <Modal
                title={t('gateways.edit_token_remark')}
                open={editModalOpen}
                confirmLoading={editMutation.isPending}
                onOk={() => editForm.submit()}
                onCancel={() => {
                    setEditModalOpen(false);
                    setEditingToken(null);
                    editForm.resetFields();
                }}
            >
                <Form
                    form={editForm}
                    layout="vertical"
                    onFinish={(values) => editMutation.mutate(values)}
                >
                    <Form.Item
                        label={t('general.remark')}
                        name="remark"
                        required={true}
                    >
                        <Input placeholder={t('general.enter_remark')}/>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default AgentGatewayTokenDrawer;
