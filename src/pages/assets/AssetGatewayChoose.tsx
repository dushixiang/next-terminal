import React, {useEffect, useState} from 'react';
import assetApi from "@/api/asset-api";
import websiteApi from "@/api/website-api";
import agentGatewayApi from "@/api/agent-gateway-api";
import sshGatewayApi from "@/api/ssh-gateway-api";
import gatewayGroupApi from "@/api/gateway-group-api";
import {useTranslation} from "react-i18next";
import {App, Button, Drawer, Select, Space} from "antd";
import {useQuery} from "@tanstack/react-query";

interface Props {
    resourceIds: string[]; // 资源ID列表（可以是 assetIds 或 websiteIds）
    type: 'asset' | 'website'; // 资源类型
    open: boolean;
    onClose: () => void;
}

const AssetGatewayChoose = ({resourceIds, type, open, onClose}: Props) => {
    let {t} = useTranslation();
    let {message} = App.useApp();

    const [gatewayType, setGatewayType] = useState<string>('');
    const [gatewayId, setGatewayId] = useState<string | undefined>(undefined);

    // 查询安全网关列表
    let agentGatewayQuery = useQuery({
        queryKey: ['agent-gateways/all'],
        queryFn: () => agentGatewayApi.getAll(),
    });

    // 查询 SSH 网关列表
    let sshGatewayQuery = useQuery({
        queryKey: ['ssh-gateways/all'],
        queryFn: () => sshGatewayApi.getAll(),
    });

    // 查询网关分组列表
    let gatewayGroupQuery = useQuery({
        queryKey: ['gateway-groups/all'],
        queryFn: () => gatewayGroupApi.getAll(),
    });

    useEffect(() => {
        if (open) {
            agentGatewayQuery.refetch();
            sshGatewayQuery.refetch();
            gatewayGroupQuery.refetch();
        } else {
            setGatewayType('');
            setGatewayId(undefined);
        }
    }, [open]);

    const handleSubmit = async () => {
        try {
            // 根据资源类型调用不同的 API
            if (type === 'asset') {
                await assetApi.changeGateway({
                    assetIds: resourceIds,
                    gatewayType: gatewayType,
                    gatewayId: gatewayId,
                });
            } else if (type === 'website') {
                await websiteApi.changeGateway({
                    websiteIds: resourceIds,
                    gatewayType: gatewayType,
                    gatewayId: gatewayId,
                });
            }

            message.success(t('general.success'));
            onClose();
        } catch (error) {
            console.error('Failed to update gateways:', error);
        }
    };

    return (
        <Drawer
            title={t('assets.change_gateway')}
            onClose={onClose}
            open={open}
            width={400}
        >
            <Space direction="vertical" style={{width: '100%'}} size="large">
                <div>
                    <div style={{marginBottom: 8}}>
                        <label>{t('assets.gateway_type')}</label>
                    </div>
                    <Select
                        style={{width: '100%'}}
                        placeholder={t('assets.select_gateway_type')}
                        value={gatewayType}
                        onChange={(value) => {
                            setGatewayType(value);
                            setGatewayId(undefined);
                        }}
                        options={[
                            {label: t('menus.gateway.submenus.ssh_gateway'), value: 'ssh'},
                            {label: t('menus.gateway.submenus.agent_gateway'), value: 'agent'},
                            {label: t('menus.gateway.submenus.gateway_group'), value: 'group'},
                        ]}
                    />
                </div>

                {gatewayType && (
                    <div>
                        <div style={{marginBottom: 8}}>
                            <label>
                                {gatewayType === 'ssh' && t('menus.gateway.submenus.ssh_gateway')}
                                {gatewayType === 'agent' && t('menus.gateway.submenus.agent_gateway')}
                                {gatewayType === 'group' && t('menus.gateway.submenus.gateway_group')}
                            </label>
                        </div>
                        <Select
                            style={{width: '100%'}}
                            placeholder={
                                gatewayType === 'ssh' ? t('assets.select_ssh_gateway') :
                                gatewayType === 'agent' ? t('assets.select_agent_gateway') :
                                t('assets.select_gateway_group')
                            }
                            value={gatewayId}
                            onChange={setGatewayId}
                            showSearch
                            options={[
                                ...(
                                    gatewayType === 'ssh' ? sshGatewayQuery.data :
                                    gatewayType === 'agent' ? agentGatewayQuery.data :
                                    gatewayGroupQuery.data || []
                                ).map((item: any) => ({
                                    label: item.name,
                                    value: item.id,
                                })),
                            ]}
                        />
                    </div>
                )}

                <Button
                    type="primary"
                    onClick={handleSubmit}
                    disabled={!gatewayType || !gatewayId}
                    style={{width: '100%'}}
                >
                    {t('actions.confirm')}
                </Button>
            </Space>
        </Drawer>
    );
};

export default AssetGatewayChoose;
