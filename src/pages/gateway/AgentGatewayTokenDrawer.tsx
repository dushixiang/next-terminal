import React, {useEffect} from 'react';
import {Drawer, Popconfirm, Table, TableProps, Typography} from "antd";
import {useTranslation} from "react-i18next";
import {useQuery} from "@tanstack/react-query";
import agentGatewayTokenApi, {AgentGatewayToken} from "@/src/api/agent-gateway-token-api";
import dayjs from "dayjs";
import NButton from "@/src/components/NButton";

interface Props {
    open: boolean;
    onClose: () => void;
}

const {Paragraph} = Typography;

const AgentGatewayTokenDrawer = ({open, onClose}: Props) => {

    let {t} = useTranslation();

    let tokenQuery = useQuery({
        queryKey: ['agent-gateway-tokens'],
        queryFn: agentGatewayTokenApi.getAll,
    });

    useEffect(() => {
        if (open) {
            tokenQuery.refetch();
        }
    }, [open]);

    const columns: TableProps<AgentGatewayToken>['columns'] = [
        {
            title: 'Token',
            dataIndex: 'id',
            key: 'id',
            render: (text) => {
                return <Paragraph copyable>
                    {text}
                </Paragraph>
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
            render: (_, record) => (
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
            ),
        },
    ];

    return (
        <Drawer title={t('gateways.token_manage')}
                onClose={onClose}
                open={open}
                width={window.innerWidth * 0.5}
        >
            <div>
                <Table<AgentGatewayToken>
                    columns={columns}
                    dataSource={tokenQuery.data}
                    pagination={false}
                />
            </div>
        </Drawer>
    );
};

export default AgentGatewayTokenDrawer;