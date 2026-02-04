import React, {useMemo, useRef} from 'react';
import {Button, Drawer} from "antd";
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
    const drawerWidth = useMemo(() => Math.min(window.innerWidth - 160, 880), []);

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

    return (
        <Drawer
            title={id ? t('actions.edit') : t('actions.new')}
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

                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ProFormText name={'host'} label={t('db.asset.host')} rules={[{required: true}]}/>
                            <ProFormDigit
                                name={'port'}
                                label={t('gateways.port')}
                                min={1}
                                max={65535}
                                rules={[{required: true}]}
                            />
                            <ProFormText name={'username'} label={t('menus.identity.submenus.user')} rules={[{required: true}]}/>
                            <div className="md:col-span-1">
                                <ProFormText.Password
                                    label={t('assets.password')}
                                    name='password'
                                    fieldProps={{
                                        iconRender: (visible) => (visible ? <EyeTwoTone/> : <EyeInvisibleOutlined/>),
                                    }}
                                />
                            </div>
                        </div>

                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="pt-3 border-t flex justify-end gap-2">
                    <Button onClick={handleCancel}>
                        {t('actions.cancel')}
                    </Button>
                    <Button type="primary" loading={confirmLoading} onClick={() => {
                        formRef.current?.validateFields()
                            .then(async values => {
                                if (!values.gatewayType) {
                                    values.gatewayType = '';
                                    values.gatewayId = '';
                                }
                                handleOk(values);
                            });
                    }}>
                        {t('actions.save')}
                    </Button>
                </div>
            </div>
        </Drawer>
    );
};

export default DatabaseAssetModal;
