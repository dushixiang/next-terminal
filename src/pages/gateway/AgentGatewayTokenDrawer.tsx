import React, {useEffect, useState} from 'react';
import {Drawer, Popconfirm, Table, TableProps, Typography, Button, Modal, Form, Input, message} from "antd";
import {useTranslation} from "react-i18next";
import {useQuery} from "@tanstack/react-query";
import agentGatewayTokenApi, {AgentGatewayToken} from "@/src/api/agent-gateway-token-api";
import dayjs from "dayjs";
import NButton from "@/src/components/NButton";
import i18n from '@/src/react-i18next/i18n';

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

    let tokenQuery = useQuery({
        queryKey: ['agent-gateway-tokens'],
        queryFn: agentGatewayTokenApi.getAll,
    });

    useEffect(() => {
        if (open) {
            tokenQuery.refetch();
        }
    }, [open]);

    const handleCreateToken = async (values: {remark: string}) => {
        try {
            const tokenData = {
                remark: values.remark,
            } as AgentGatewayToken;
            
            await agentGatewayTokenApi.create(tokenData);
            message.success(t('general.success'));
            setCreateModalOpen(false);
            form.resetFields();
            tokenQuery.refetch();
        } catch (error) {
            message.error(t('general.error'));
        }
    };

    const handleEditToken = async (values: {remark: string}) => {
        if (!editingToken) return;
        
        try {
            const updatedToken = {
                ...editingToken,
                remark: values.remark,
            };
            
            await agentGatewayTokenApi.updateById(editingToken.id, updatedToken);
            message.success(t('general.success'));
            setEditModalOpen(false);
            setEditingToken(null);
            editForm.resetFields();
            tokenQuery.refetch();
        } catch (error) {
            message.error(t('general.error'));
        }
    };

    const openEditModal = (token: AgentGatewayToken) => {
        setEditingToken(token);
        editForm.setFieldsValue({
            remark: token.remark,
        });
        setEditModalOpen(true);
    };

    const columns: TableProps<AgentGatewayToken>['columns'] = [
        {
            title: 'Token',
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
                            <div className="px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400 border-l-2 border-blue-200 dark:border-blue-700">
                                <span className="font-medium text-gray-700 dark:text-gray-300">备注：</span>
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
            title: t('actions.option'),
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
                        title={t('general.delete_confirm')}
                        onConfirm={async () => {
                            await agentGatewayTokenApi.deleteById(record.id);
                            tokenQuery.refetch();
                        }}
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
                width={window.innerWidth * 0.6}
                extra={
                    <Button
                        type="primary"
                        onClick={() => setCreateModalOpen(true)}
                    >
                        {t('actions.add')}
                    </Button>
                }
            >
                <Table<AgentGatewayToken>
                    columns={columns}
                    dataSource={tokenQuery.data}
                    pagination={false}
                    rowKey="id"
                />
            </Drawer>

            {/* 新增令牌模态框 */}
            <Modal
                title={t('gateways.add_token')}
                open={createModalOpen}
                onOk={() => form.submit()}
                onCancel={() => {
                    setCreateModalOpen(false);
                    form.resetFields();
                }}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreateToken}
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
                        <Input placeholder={t('general.enter_remark')} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* 修改令牌备注模态框 */}
            <Modal
                title={t('gateways.edit_token_remark')}
                open={editModalOpen}
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
                    onFinish={handleEditToken}
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
                        <Input placeholder={t('general.enter_remark')} />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default AgentGatewayTokenDrawer;