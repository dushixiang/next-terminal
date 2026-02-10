import React, {useEffect, useRef, useState} from 'react';
import {Button, Drawer, Space} from "antd";
import {
    ProForm,
    ProFormDependency,
    ProFormDigit,
    ProFormInstance,
    ProFormSelect,
    ProFormText,
    ProFormTextArea,
} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
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
                                id,
                            }: DatabaseAssetModalProps) => {
    const {t} = useTranslation();
    const formRef = useRef<ProFormInstance>(null);
    const drawerWidth = 1200;
    const [decrypted, setDecrypted] = useState(false);
    const [mfaOpen, setMfaOpen] = useState(false);

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
            tags: [],
        };
    };

    const sshGatewayRequest = async () => {
        const items = await sshGatewayApi.getAll();
        return items.map(item => ({
            label: item.name,
            value: item.id,
        }));
    };

    const agentGatewayRequest = async () => {
        const items = await agentGatewayApi.getAll();
        return items.map(item => ({
            label: item.name,
            value: item.id,
        }));
    };

    const gatewayGroupRequest = async () => {
        const items = await gatewayGroupApi.getAll();
        return items.map(item => ({
            label: item.name,
            value: item.id,
        }));
    };

    const handleSave = () => {
        formRef.current?.validateFields()
            .then(async values => {
                if (!values.gatewayType) {
                    values.gatewayType = '';
                    values.gatewayId = '';
                }
                handleOk(values);
            });
    };

    const drawerExtra = (
        <Space size={8}>
            <Button onClick={handleCancel}>
                {t('actions.cancel')}
            </Button>
            <Button type="primary" loading={confirmLoading} onClick={handleSave}>
                {t('actions.save')}
            </Button>
        </Space>
    );

    return (
        <Drawer
            title={id ? t('actions.edit') : t('actions.new')}
            extra={drawerExtra}
            onClose={handleCancel}
            open={open}
            width={drawerWidth}
            destroyOnHidden={true}
        >
            <div className="flex h-full flex-col">
                <div className="flex-1 overflow-auto pr-1">
                    <ProForm formRef={formRef} request={get} submitter={false}>
                        <ProFormText hidden={true} name={'id'}/>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <ProFormText name={'name'} label={t('general.name')} rules={[{required: true}]}/>
                            </div>
                            <ProFormSelect
                                label={t('db.asset.type')}
                                name='type'
                                rules={[{required: true}]}
                                options={[
                                    {label: t('db.asset.type_mysql'), value: 'mysql'},
                                    {label: t('db.asset.type_pg'), value: 'pg', disabled: true},
                                ]}
                            />
                            <ProFormSelect
                                label={t('assets.tags')}
                                name='tags'
                                fieldProps={{
                                    mode: 'tags',
                                }}
                                showSearch
                            />
                            <div className="md:col-span-2">
                                <ProFormTextArea label={t('general.remark')} name='description' fieldProps={{rows: 3}}/>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <ProFormText name={'host'} label={t('db.asset.host')} rules={[{required: true}]}/>
                                </div>
                                <ProFormDigit
                                    name={'port'}
                                    label={t('gateways.port')}
                                    min={1}
                                    max={65535}
                                    rules={[{required: true}]}
                                />
                            </div>
                            <ProFormText name={'username'} label={t('menus.identity.submenus.user')} rules={[{required: true}]}/>
                            <ProFormText.Password
                                label={t('assets.password')}
                                name='password'
                                fieldProps={{
                                    iconRender: (visible) => (visible ? <EyeTwoTone/> : <EyeInvisibleOutlined/>),
                                    visibilityToggle: {
                                        onVisibleChange: (visible) => {
                                            if (id && visible && !decrypted) {
                                                setMfaOpen(true);
                                            }
                                        }
                                    }
                                }}
                            />
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ProFormSelect
                                label={t('assets.gateway_type')}
                                name='gatewayType'
                                options={[
                                    {label: t('assets.no_gateway'), value: ''},
                                    {label: t('menus.gateway.submenus.ssh_gateway'), value: 'ssh'},
                                    {label: t('menus.gateway.submenus.agent_gateway'), value: 'agent'},
                                    {label: t('menus.gateway.submenus.gateway_group'), value: 'group'},
                                ]}
                                fieldProps={{
                                    allowClear: true,
                                }}
                            />
                            <ProFormDependency name={['gatewayType']}>
                                {({gatewayType}) => {
                                    if (gatewayType === 'ssh') {
                                        return (
                                            <ProFormSelect
                                                key="ssh"
                                                label={t('menus.gateway.submenus.ssh_gateway')}
                                                name='gatewayId'
                                                request={sshGatewayRequest}
                                                showSearch
                                                rules={[{required: true}]}
                                            />
                                        );
                                    }
                                    if (gatewayType === 'agent') {
                                        return (
                                            <ProFormSelect
                                                key="agent"
                                                label={t('menus.gateway.submenus.agent_gateway')}
                                                name='gatewayId'
                                                request={agentGatewayRequest}
                                                showSearch
                                                rules={[{required: true}]}
                                            />
                                        );
                                    }
                                    if (gatewayType === 'group') {
                                        return (
                                            <ProFormSelect
                                                key="group"
                                                label={t('menus.gateway.submenus.gateway_group')}
                                                name='gatewayId'
                                                request={gatewayGroupRequest}
                                                showSearch
                                                rules={[{required: true}]}
                                            />
                                        );
                                    }
                                    return <div />;
                                }}
                            </ProFormDependency>
                        </div>
                    </ProForm>
                </div>
            </div>

            <MultiFactorAuthentication
                open={mfaOpen}
                handleOk={async (securityToken) => {
                    if (!id) {
                        return;
                    }
                    const res = await api.decrypt(id, securityToken);
                    formRef.current?.setFieldsValue({
                        password: res.password,
                    });
                    setDecrypted(true);
                    setMfaOpen(false);
                }}
                handleCancel={() => setMfaOpen(false)}
            />
        </Drawer>
    );
};

export default DatabaseAssetModal;
