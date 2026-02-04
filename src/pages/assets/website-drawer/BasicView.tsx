import React from 'react';
import { Card } from "antd";
import {
    ProFormDependency,
    ProFormDigit,
    ProFormRadio,
    ProFormSelect,
    ProFormSwitch,
    ProFormText,
    ProFormTreeSelect
} from "@ant-design/pro-components";
import { useTranslation } from "react-i18next";
import { ServerIcon } from "lucide-react";

import websiteApi from "@/api/website-api";
import agentGatewayApi from "@/api/agent-gateway-api";
import sshGatewayApi from "@/api/ssh-gateway-api";
import gatewayGroupApi from "@/api/gateway-group-api";
import LogoSelector from "@/pages/assets/website-drawer/LogoSelector";
import { LogoItem } from "@/pages/assets/website-drawer/types";

interface BasicViewProps {
    logo?: string;
    onLogoChange: (logo: string) => void;
    logosData?: LogoItem[];
}

const BasicView: React.FC<BasicViewProps> = ({ logo, onLogoChange, logosData }) => {
    const { t } = useTranslation();

    const schemeOptions = [
        { value: 'http', label: 'HTTP' },
        { value: 'https', label: 'HTTPS' },
    ];

    const agentGatewayRequest = async () => {
        const items = await agentGatewayApi.getAll();
        return items.map(item => ({
            label: item.name,
            value: item.id,
        }));
    };

    const sshGatewayRequest = async () => {
        const items = await sshGatewayApi.getAll();
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

    const transformGroupData = (data: any[]): any[] => {
        return data.map(item => ({
            title: item.title,
            value: item.key as string,
            children: item.children ? transformGroupData(item.children) : [],
        }));
    };

    const groupsRequest = async () => {
        const groups = await websiteApi.getGroups();
        return transformGroupData(groups);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 rounded-lg bg-slate-50/60 p-4 dark:bg-slate-900/40 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                        <LogoSelector
                            logo={logo}
                            onLogoChange={onLogoChange}
                            logosData={logosData}
                        />
                        <div className="text-xs text-slate-500">
                            {t('assets.logo')}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <ProFormSwitch
                            label={t('general.enabled')}
                            name="enabled"
                            rules={[{ required: true }]}
                            fieldProps={{
                                checkedChildren: t('general.yes'),
                                unCheckedChildren: t('general.no'),
                            }}
                        />
                        <ProFormSwitch
                            label={t('assets.disable_access_log')}
                            name="disableAccessLog"
                            tooltip={t('assets.disable_access_log_tip')}
                            fieldProps={{
                                checkedChildren: t('general.yes'),
                                unCheckedChildren: t('general.no'),
                            }}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <ProFormText
                        label={t('general.name')}
                        name="name"
                        rules={[{ required: true }]}
                        placeholder={t('general.name')}
                    />

                    <ProFormTreeSelect
                        label={t('assets.group')}
                        name="groupId"
                        request={groupsRequest}
                        placeholder={t('gateway_group.name_placeholder')}
                        fieldProps={{
                            treeDefaultExpandAll: true,
                            allowClear: true,
                            showSearch: true,
                            treeNodeFilterProp: 'title',
                        }}
                    />

                    <ProFormText
                        label={t('assets.domain')}
                        name="domain"
                        rules={[{ required: true }]}
                        extra={t('assets.domain_tip')}
                        placeholder="example.com"
                    />

                    <ProFormText
                        label={t('assets.entrance')}
                        name="entrance"
                        extra={t('assets.entrance_tip')}
                        placeholder="/admin"
                    />
                </div>
            </div>

            <Card size="small" className="bg-slate-50/60 dark:bg-slate-900/40">
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <ServerIcon className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            {t('assets.target_server')}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-2">
                            <ProFormSelect
                                label={t('assets.scheme')}
                                name="scheme"
                                options={schemeOptions}
                                rules={[{ required: true }]}
                            />
                        </div>

                        <div className="md:col-span-7">
                            <ProFormText
                                label={t('assets.forward_host_or_ip')}
                                name="host"
                                rules={[{ required: true }]}
                                placeholder="192.168.1.100"
                            />
                        </div>

                        <div className="md:col-span-3">
                            <ProFormDigit
                                name="port"
                                label={t('assets.forward_port')}
                                min={1}
                                max={65535}
                                fieldProps={{ precision: 0 }}
                                placeholder="80"
                                rules={[{ required: true }]}
                            />
                        </div>
                    </div>
                </div>
            </Card>

            <ProFormRadio.Group
                label={t('assets.gateway_type')}
                name='gatewayType'
                options={[
                    {label: t('assets.no_gateway'), value: ''},
                    {label: t('menus.gateway.submenus.ssh_gateway'), value: 'ssh'},
                    {label: t('menus.gateway.submenus.agent_gateway'), value: 'agent'},
                    {label: t('menus.gateway.submenus.gateway_group'), value: 'group'},
                ]}
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
                                params={{gatewayType}}
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
                                params={{gatewayType}}
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
                                params={{gatewayType}}
                                showSearch
                                rules={[{required: true}]}
                            />
                        );
                    }
                    return null;
                }}
            </ProFormDependency>
        </div>
    );
};

export default BasicView;
