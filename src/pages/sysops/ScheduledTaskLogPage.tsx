import React, {useEffect, useRef} from 'react';
import {Drawer, Progress, Tag} from "antd";
import {ActionType, ProColumns, ProTable} from '@ant-design/pro-components';
import scheduledTaskApi, {CheckStatusResult, ExecScriptResult, ScheduledTaskLog} from "@/src/api/scheduled-task-api";
import NButton from "@/src/components/NButton";
import {useTranslation} from "react-i18next";
import {maybe} from "@/src/utils/maybe";

interface Props {
    open: boolean
    handleCancel: () => void
    jobId: string
}

const ScheduledTaskLogPage = ({open, jobId, handleCancel}: Props) => {

    let {t} = useTranslation();
    const actionRef = useRef<ActionType>();

    useEffect(() => {
        if (!open) {
            return;
        }
        actionRef.current?.reload();
    }, [open, jobId]);

    const columns: ProColumns<ScheduledTaskLog>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('sysops.logs.exec_at'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            hideInSearch: true,
            sorter: true,
            width: 191,
            valueType: 'dateTime',
        },
        {
            title: t('sysops.logs.messages'),
            dataIndex: 'message',
            key: 'message',
            hideInSearch: true,
            render: (_, record) => {
                switch (record.jobType) {
                    case 'asset-check-status':
                        let results = record.results as CheckStatusResult[];
                        let active = results?.filter(item => item.active)?.length;
                        active = maybe(active, 0)
                        let inactive = results?.filter(item => !item.active)?.length;
                        inactive = maybe(inactive, 0)
                        return <NButton><p
                            className={'underline'}>{`${t('online')}: ${active}, ${t('offline')}: ${inactive}`}</p>
                        </NButton>;
                    case 'asset-exec-command':
                        let results2 = record.results as ExecScriptResult[];
                        let success = results2?.filter(item => item.success)?.length;
                        success = maybe(success, 0)
                        let failed = results2?.filter(item => !item.success)?.length;
                        failed = maybe(failed, 0)
                        return <div className={''}>
                            {success > 0 && '✅'}
                            {failed > 0 && '❌'}
                            {/*{`✅${success}, ❌: ${failed}`}*/}
                        </div>;
                }
                return ''
            }
        }
    ]

    const expandedRowRender = (record: ScheduledTaskLog) => {

        const columns = () => {
            // let columns: ProColumns<CheckStatusResult | ExecScriptResult>[];
            switch (record.jobType) {
                case 'asset-check-status':
                    return [
                        {title: 'Name', dataIndex: 'name', key: 'name'},
                        {
                            title: 'Active', dataIndex: 'active', key: 'active', render: (text: any) => {
                                if (text === true) {
                                    return <Tag color={'green'} bordered={false}>Active</Tag>
                                } else {
                                    return <Tag color={'red'} bordered={false}>Inactive</Tag>
                                }
                            }
                        },
                        {title: 'Used Time', dataIndex: 'usedTimeStr', key: 'usedTimeStr'},
                        {
                            title: 'Error',
                            dataIndex: 'error',
                            key: 'error',
                        },
                    ]
                case 'asset-exec-command':
                    return [
                        {title: 'Name', dataIndex: 'name', key: 'name'},
                        {
                            title: 'Status',
                            dataIndex: 'success',
                            key: 'success',
                            render: (text: any) => {
                                if (text === true) {
                                    return <>
                                        <Progress
                                            type="circle"
                                            trailColor="#e6f4ff"
                                            percent={100}
                                            strokeWidth={20}
                                            size={14}
                                            format={(number) => `Success`}
                                        />
                                        <span style={{marginLeft: 8}}>{t('general.success')}</span>
                                    </>
                                } else {
                                    return <>
                                        <Progress
                                            status="exception"
                                            type="circle"
                                            trailColor="#e6f4ff"
                                            percent={90}
                                            strokeWidth={20}
                                            size={14}
                                            format={(number) => `Success`}
                                        />
                                        <span style={{marginLeft: 8}}>{t('general.failed')}</span>
                                    </>
                                }
                            }
                        },
                        {title: 'Used Time', dataIndex: 'usedTimeStr', key: 'usedTimeStr'},
                        {
                            title: 'Script',
                            dataIndex: 'script',
                            key: 'script',
                            valueType: 'code',
                        },
                        {
                            title: 'Result',
                            dataIndex: 'result',
                            key: 'result',
                            valueType: 'code',
                        },
                    ]
            }
        }


        return <ProTable
            columns={columns()}
            headerTitle={false}
            search={false}
            options={false}
            dataSource={record.results}
            pagination={false}
        />
    }

    return (
        <Drawer
            title={t('sysops.logs.label')}
            placement="right"
            width={window.innerWidth * 0.9}
            closable={true}
            maskClosable={true}
            onClose={handleCancel}
            open={open}
        >
            <ProTable
                columns={columns}
                actionRef={actionRef}
                request={async (params = {}, sort, filter) => {
                    let queryParams = {
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        name: params.name,
                        sort: JSON.stringify(sort),
                    }
                    let result = await scheduledTaskApi.getLogPaging(jobId, queryParams);
                    let items = result['items'];

                    return {
                        data: items,
                        success: true,
                        total: result['total']
                    };
                }}
                expandable={{expandedRowRender}}
                rowKey="id"
                search={false}
                pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true
                }}
                options={false}
                dateFormatter="string"
            />
        </Drawer>
    );
};

export default ScheduledTaskLogPage;