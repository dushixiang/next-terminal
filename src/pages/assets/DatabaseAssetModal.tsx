import {useFormRequest} from "@/hook/use-antd-form-query";
import QuerySelect from "@/components/QuerySelect";
import React, {useEffect, useState} from 'react';
import {App, Button, Col, Form, Input, InputNumber, Modal, Radio, Row, Select, Space} from 'antd';
import {useTranslation} from "react-i18next";
import {useMutation} from "@tanstack/react-query";
import databaseAssetApi from "@/api/database-asset-api";
import sshGatewayApi from "@/api/ssh-gateway-api";
import agentGatewayApi from "@/api/agent-gateway-api";
import gatewayGroupApi from "@/api/gateway-group-api";
import {EyeInvisibleOutlined, EyeTwoTone} from "@ant-design/icons";
import MultiFactorAuthentication from "@/pages/account/MultiFactorAuthentication";

const api = databaseAssetApi;

export interface DatabaseAssetModalProps {
    open: boolean;
    handleOk: (values: any) => void;
    handleCancel: () => void;
    confirmLoading: boolean;
    id: string | undefined;
}

const DatabaseAssetModal = ({
                                open,
                                handleOk,
                                handleCancel,
                                confirmLoading,
                                id
                            }: DatabaseAssetModalProps) => {
    const {t} = useTranslation();
    const {message} = App.useApp();
    const [form] = Form.useForm();
    const gatewayType = Form.useWatch('gatewayType', form);
    const [decrypted, setDecrypted] = useState(false);
    const [mfaOpen, setMfaOpen] = useState(false);
    const formItemStyle = {marginBottom: 12};

    useEffect(() => {
        if (!open) {
            setDecrypted(false);
            setMfaOpen(false);
        }
    }, [open]);
    const get = async () => {
        if (id) {
            return await api.getById(id);
        }
        return {
            type: 'mysql',
            port: 3306,
            gatewayType: '',
            tags: []
        };
    };
    const sshGatewayRequest = async () => {
        const items = await sshGatewayApi.getAll();
        return items.map(item => ({
            label: item.name,
            value: item.id
        }));
    };
    const agentGatewayRequest = async () => {
        const items = await agentGatewayApi.getAll();
        return items.map(item => ({
            label: item.name,
            value: item.id
        }));
    };
    const gatewayGroupRequest = async () => {
        const items = await gatewayGroupApi.getAll();
        return items.map(item => ({
            label: item.name,
            value: item.id
        }));
    };
    const handleSave = () => {
        form.validateFields().then(async values => {
            if (!values.gatewayType) {
                values.gatewayType = '';
                values.gatewayId = '';
            }
            handleOk(values);
        });
    };
    const testMutation = useMutation({
        mutationFn: api.test,
        onSuccess: () => {
            message.success(t('general.success'));
        }
    });
    const handleTest = () => {
        form.validateFields().then(values => {
            if (!values.gatewayType) {
                values.gatewayType = '';
                values.gatewayId = '';
            }
            testMutation.mutate(values);
        });
    };
    const footer = <Space size={8}>
        <Button onClick={handleCancel}>
            {t('actions.cancel')}
        </Button>
        <Button onClick={handleTest} loading={testMutation.isPending}>
            {t('actions.test_connection')}
        </Button>
        <Button type="primary" loading={confirmLoading} onClick={handleSave}>
            {t('actions.save')}
        </Button>
    </Space>;

    useFormRequest(form, ["form-request", "web/src/pages/assets/DatabaseAssetModal.tsx", open, id], get, open);
    return <Modal title={id ? t('actions.edit') : t('actions.new')}
                  open={open}
                  onCancel={handleCancel}
                  destroyOnHidden={true}
                  mask={{
                      closable: true,
                  }}
                  footer={footer}
    >
        <Form form={form} layout="vertical">
            <Form.Item hidden={true} name={'id'}>
                <Input/>
            </Form.Item>
            <Space orientation="vertical" size={8} style={{width: '100%'}}>
                <Form.Item name={'name'} label={t('general.name')} rules={[{required: true}]} style={formItemStyle}>
                    <Input/>
                </Form.Item>

                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item label={t('db.asset.type')} name='type' rules={[{required: true}]}
                                   style={formItemStyle}>
                            <Select options={[{
                                label: t('db.asset.type_mysql'),
                                value: 'mysql'
                            }, {
                                label: t('db.asset.type_pg'),
                                value: 'pg',
                                disabled: true
                            }]}/>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label={t('assets.tags')} name='tags' style={formItemStyle}>
                            <Select
                                mode='tags'
                                showSearch/>
                        </Form.Item>
                    </Col>
                    <Col span={24}>
                        <Form.Item label={t('general.remark')} name='description' style={formItemStyle}>
                            <Input.TextArea rows={3}/>
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={12}>
                    <Col xs={24} md={16}>
                        <Form.Item name={'host'} label={t('db.asset.host')} rules={[{required: true}]}
                                   style={formItemStyle}>
                            <Input/>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name={'port'} label={t('gateways.port')} rules={[{required: true}]}
                                   style={formItemStyle}>
                            <InputNumber min={1} max={65535} style={{width: '100%'}}/>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name={'username'} label={t('menus.identity.submenus.user')}
                                   rules={[{required: true}]} style={formItemStyle}>
                            <Input autoComplete='off'/>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item label={t('assets.password')} name='password' style={formItemStyle}>
                            <Input.Password
                                autoComplete='new-password'
                                iconRender={visible => visible ? <EyeTwoTone/> : <EyeInvisibleOutlined/>}
                                visibilityToggle={{
                                    onVisibleChange: visible => {
                                        if (id && visible && !decrypted) {
                                            setMfaOpen(true);
                                        }
                                    }
                                }}/>
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item label={t('assets.gateway_type')} name='gatewayType' style={formItemStyle}>
                    <Radio.Group options={[{
                        label: t('assets.no_gateway'),
                        value: ''
                    }, {
                        label: t('menus.gateway.submenus.ssh_gateway'),
                        value: 'ssh'
                    }, {
                        label: t('menus.gateway.submenus.agent_gateway'),
                        value: 'agent'
                    }, {
                        label: t('menus.gateway.submenus.gateway_group'),
                        value: 'group'
                    }]}/>
                </Form.Item>

                {gatewayType === 'ssh' && <Form.Item label={t('menus.gateway.submenus.ssh_gateway')} name='gatewayId'
                                                      rules={[{required: true}]}
                                                      style={formItemStyle}>
                    <QuerySelect showSearch params={{
                        gatewayType
                    }} request={sshGatewayRequest}/>
                </Form.Item>}
                {gatewayType === 'agent' && <Form.Item label={t('menus.gateway.submenus.agent_gateway')}
                                                       name='gatewayId'
                                                       rules={[{required: true}]}
                                                       style={formItemStyle}>
                    <QuerySelect showSearch params={{
                        gatewayType
                    }} request={agentGatewayRequest}/>
                </Form.Item>}
                {gatewayType === 'group' && <Form.Item label={t('menus.gateway.submenus.gateway_group')}
                                                       name='gatewayId'
                                                       rules={[{required: true}]}
                                                       style={formItemStyle}>
                    <QuerySelect showSearch params={{
                        gatewayType
                    }} request={gatewayGroupRequest}/>
                </Form.Item>}
            </Space>
        </Form>

        <MultiFactorAuthentication
            open={mfaOpen}
            handleOk={async securityToken => {
                if (!id) {
                    return;
                }
                const res = await api.decrypt(id, securityToken);
                form.setFieldsValue({
                    password: res.password
                });
                setDecrypted(true);
                setMfaOpen(false);
            }}
            handleCancel={() => setMfaOpen(false)}
        />
    </Modal>;
};
export default DatabaseAssetModal;
