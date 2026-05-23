import QuerySelect from "@/components/QuerySelect";
import React from 'react';
import {Form, Radio} from "antd";
import {useTranslation} from "react-i18next";
import agentGatewayApi from "@/api/agent-gateway-api";
import sshGatewayApi from "@/api/ssh-gateway-api";
import gatewayGroupApi from "@/api/gateway-group-api";

const GatewayView: React.FC = () => {
    const {t} = useTranslation();

    const agentGatewayRequest = async () => {
        const items = await agentGatewayApi.getAll();
        return items.map(item => ({
            label: item.name,
            value: item.id
        }));
    };

    const sshGatewayRequest = async () => {
        const items = await sshGatewayApi.getAll();
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

    return (
        <div className="flex flex-col gap-4">
            <Form.Item label={t('assets.gateway_type')} name='gatewayType'>
                <Radio.Group options={[
                    {
                        label: t('assets.no_gateway'),
                        value: ''
                    },
                    {
                        label: t('menus.gateway.submenus.ssh_gateway'),
                        value: 'ssh'
                    },
                    {
                        label: t('menus.gateway.submenus.agent_gateway'),
                        value: 'agent'
                    },
                    {
                        label: t('menus.gateway.submenus.gateway_group'),
                        value: 'group'
                    }
                ]}/>
            </Form.Item>

            <Form.Item noStyle={true} shouldUpdate={true}>{form => (({
                gatewayType
            }) => {
                if (gatewayType === 'ssh') {
                    return (
                        <Form.Item key="ssh" label={t('menus.gateway.submenus.ssh_gateway')} name='gatewayId' rules={[{required: true}]}>
                            <QuerySelect showSearch params={{gatewayType}} request={sshGatewayRequest}/>
                        </Form.Item>
                    );
                }
                if (gatewayType === 'agent') {
                    return (
                        <Form.Item key="agent" label={t('menus.gateway.submenus.agent_gateway')} name='gatewayId' rules={[{required: true}]}>
                            <QuerySelect showSearch params={{gatewayType}} request={agentGatewayRequest}/>
                        </Form.Item>
                    );
                }
                if (gatewayType === 'group') {
                    return (
                        <Form.Item key="group" label={t('menus.gateway.submenus.gateway_group')} name='gatewayId' rules={[{required: true}]}>
                            <QuerySelect showSearch params={{gatewayType}} request={gatewayGroupRequest}/>
                        </Form.Item>
                    );
                }
                return null;
            })(form.getFieldsValue(true), form)}</Form.Item>
        </div>
    );
};

export default GatewayView;
