import React, {useRef} from 'react';
import {ActionType, ProColumns, ProTable} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import fileSystemLogApi, {FileSystemLog} from "@/src/api/fileystem-log-api";
import {App, Button} from "antd";
import {useMutation} from "@tanstack/react-query";


const FileSystemLogPage = () => {

    const {t} = useTranslation();
    const actionRef = useRef<ActionType>();
    let {modal} = App.useApp();

    let clearMutation = useMutation({
        mutationFn: fileSystemLogApi.clear,
        onSuccess: () => {
            actionRef.current?.reload();
        }
    });

    const columns: ProColumns<FileSystemLog>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('audit.asset'),
            key: 'assetName',
            dataIndex: 'assetName',
            hideInSearch: true,
            render: ((text, record) => {
                return <Link to={`/asset/${record['assetId']}`}>{text}</Link>
            })
        },
        {
            title: t('audit.user'),
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
            valueEnum: {
                rm: {text: t('authorised.strategy.remove')},
                edit: {text: t('authorised.strategy.edit')},
                upload: {text: t('authorised.strategy.upload'),},
                download: {text: t('authorised.strategy.download'),},
                rename: {text: t('authorised.strategy.rename'),},
                remove: {text: t('authorised.strategy.remove'),},
                'create-dir': {text: t('authorised.strategy.create_dir'),},
                'create-file': {text: t('authorised.strategy.create_file'),},
            },
            width: 100,
        },
        {
            title: t('audit.filename'),
            key: 'fileName',
            dataIndex: 'fileName',
            hideInSearch: true,
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
            <ProTable
                defaultSize={'small'}
                columns={columns}
                actionRef={actionRef}
                request={async (params = {}, sort, filter) => {
                    let queryParams = {
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        sort: JSON.stringify(sort),
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