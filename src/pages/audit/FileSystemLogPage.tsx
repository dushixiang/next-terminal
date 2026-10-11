import fileSystemLogApi,{ FileSystemLog } from "@/api/fileystem-log-api";
import IPRegion from "@/components/IPRegion";
import NTable,{ type NColumn,type NTableActionType } from "@/components/NTable";
import { getSort } from "@/utils/sort";
import { useMutation } from "@tanstack/react-query";
import { App,Button } from "antd";
import { useRef } from 'react';
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";


const FileSystemLogPage = () => {

    const {t} = useTranslation();
    const actionRef = useRef<NTableActionType>(null);
    let {modal} = App.useApp();

    let clearMutation = useMutation({
        mutationFn: fileSystemLogApi.clear,
        onSuccess: () => {
            actionRef.current?.reload();
        }
    });

    const columns: NColumn<FileSystemLog>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('menus.resource.submenus.asset'),
            key: 'assetName',
            dataIndex: 'assetName',
            hideInSearch: true,
            render: ((text, record) => {
                return <Link to={`/asset?assetId=${record['assetId']}`}>{text}</Link>
            })
        },
        {
            title: t('menus.identity.submenus.user'),
            key: 'userName',
            dataIndex: 'userName',
            hideInSearch: true,
            render: ((text, record) => {
                return <Link to={`/user/${record['userId']}`}>{text}</Link>
            })
        },
        {
            title: t('audit.action'),
            key: 'action',
            dataIndex: 'action',
            valueType: 'select',
            valueEnum: Object.fromEntries(
                ['ls', 'upload', 'download', 'remove', 'edit', 'create-dir', 'create-file', 'rename', 'chmod']
                    .map(action => [action, {text: t(`audit.filesystem_actions.${action}`)}]),
            ),
            width: 140,
        },
        {
            title: t('audit.filename'),
            key: 'fileName',
            dataIndex: 'fileName',
            hideInSearch: true,
        },
        {
            title: t('audit.client_ip'),
            key: 'clientIp',
            dataIndex: 'clientIp',
            hideInSearch: true,
            render: (_, record) => <IPRegion ip={record.clientIp} regionInfo={record.regionInfo}/>,
        },
        {
            title: t('audit.operation.at'),
            key: 'createdAt',
            dataIndex: 'createdAt',
            hideInSearch: true,
            valueType: 'dateTime'
        },
    ];

    return (
        <div>
            <NTable
                defaultSize={'small'}
                columns={columns}
                actionRef={actionRef}
                    request={async (params = {}, sort, _filter) => {
                        let [sortOrder, sortField] = getSort(sort);
                        
                        let queryParams = {
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        sortOrder: sortOrder,
                        sortField: sortField,
                        action: params.action,
                        username: params.username,
                        clientIp: params.clientIp,
                    }
                    let result = await fileSystemLogApi.getPaging(queryParams);
                    return {
                        data: result['items'],
                        success: true,
                        total: result['total']
                    };
                }}
                rowKey="id"
                search={{
                    labelWidth: 'auto',
                }}
                pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true
                }}
                dateFormatter="string"
                headerTitle={t('menus.log_audit.submenus.filesystem_log')}
                toolBarRender={() => [
                    <Button key="clear"
                            type="primary"
                            danger
                            onClick={() => {
                                modal.confirm({
                                    title: t('general.clear_confirm'),
                                    onOk: async () => {
                                        return clearMutation.mutate();
                                    }
                                })
                            }}>
                        {t('actions.clear')}
                    </Button>,
                ]}
            />
        </div>
    );
};

export default FileSystemLogPage;
