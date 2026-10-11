import scheduledTaskApi,{ ScheduledTask } from "@/api/scheduled-task-api";
import NButton from "@/components/NButton";
import NTable,{ type NColumn,type NTableActionType } from "@/components/NTable";
import MultiFactorAuthentication from "@/pages/account/MultiFactorAuthentication";
import ScheduledTaskLogPage from "@/pages/sysops/ScheduledTaskLogPage";
import ScheduledTaskModal from "@/pages/sysops/ScheduledTaskModal";
import { getSort } from "@/utils/sort";
import { useMutation } from "@tanstack/react-query";
import { App,Button,Popconfirm,Space,Switch,Tag,Tooltip } from "antd";
import { useRef,useState } from 'react';
import { useTranslation } from "react-i18next";

const api = scheduledTaskApi;

const ScheduledTaskPage = () => {
    const {t} = useTranslation();
    const actionRef = useRef<NTableActionType>(null);
    let [open, setOpen] = useState<boolean>(false);
    let [logOpen, setLogOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>('');

    let [mfaOpen, setMfaOpen] = useState(false);
    let [values, setValues] = useState<Record<string, any>>({});

    const {message} = App.useApp();

    const postOrUpdate = async (values: any) => {
        if (values['id']) {
            await api.updateById(values['id'], values);
        } else {
            await api.create(values);
        }
    }

    let mutation = useMutation({
        mutationFn: postOrUpdate,
        onSuccess: () => {
            actionRef.current?.reload();
            setOpen(false);
            setSelectedRowKey('');
            showSuccess();
        }
    });

    function showSuccess() {
        message.open({
            type: 'success',
            content: t('general.success'),
        });
    }

    const columns: NColumn<ScheduledTask>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('general.name'),
            dataIndex: 'name',
            key: 'name',
            sorter: true,
        }
        , {
            title: t('general.status'),
            dataIndex: 'enabled',
            key: 'enabled',
            hideInSearch: true,
            render: (enabled, record, index) => {
                return <Switch
                    checkedChildren={t('general.enabled')}
                    unCheckedChildren={t('general.disabled')}
                    checked={enabled === true}
                    onChange={(_checked) => handleChangeStatus(record['id'], !enabled, index)}
                />
            }
        }, {
            title: t('assets.type'),
            dataIndex: 'type',
            key: 'type',
            hideInSearch: true,
            render: (func, _record) => {
                switch (func) {
                    case "asset-check-status":
                        return <Tag color="blue" variant="filled">{t('sysops.type.options.check_status')}</Tag>;
                    case "asset-exec-command":
                        return <Tag color="red" variant="filled">{t('sysops.type.options.exec_command')}</Tag>;
                    case "delete-history-log":
                        return <Tag color="green" variant="filled">{t('sysops.type.options.delete_log')}</Tag>;
                    case "renew-certificate":
                        return <Tag color="orange" variant="filled">{t('assets.certificates.renew')}</Tag>;
                    default:
                        return '';
                }
            }
        }, {
            title: t('sysops.spec'),
            dataIndex: 'spec',
            key: 'spec',
            hideInSearch: true,
        }, {
            title: t('general.created_at'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            hideInSearch: true,
            valueType: 'dateTime',
            sorter: true,
        }, {
            title: t('sysops.last_exec_at'),
            dataIndex: 'lastExecAt',
            key: 'lastExecAt',
            hideInSearch: true,
            valueType: 'dateTime',
            sorter: true,
        },
        {
            title: t('actions.label'),
            valueType: 'option',
            key: 'option',
            width: 200,
            render: (_text: unknown, record: ScheduledTask, index: number) => (
                <Space>
                    <Tooltip title={t('sysops.options.exec_tip')}>
                    <NButton
                        key="exec"
                        // disabled={execLoading[index]}
                        onClick={() => handleExec(record.id, index)}
                    >
                        {t('sysops.options.exec')}
                    </NButton>
                    </Tooltip>
                    <NButton
                        key="logs"
                        onClick={() => handleShowLog(record.id)}
                    >
                        {t('sysops.options.logs')}
                    </NButton>
                    <NButton
                        key="edit"
                        onClick={() => {
                            setOpen(true);
                            setSelectedRowKey(record.id);
                        }}
                    >
                        {t('actions.edit')}
                    </NButton>
                    <Popconfirm
                        key={'delete-confirm'}
                        title={t('general.confirm_delete')}
                        onConfirm={async () => {
                            await api.deleteById(record.id);
                            actionRef.current?.reload();
                        }}
                    >
                        <NButton key='delete' danger={true}>{t('actions.delete')}</NButton>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const handleChangeStatus = async (id: string, enabled: boolean, _index: number) => {
        await api.changeStatus(id, enabled);
        actionRef.current?.reload();
    }

    const handleExec = async (id: string, _index: number) => {
        message.loading({content: 'loading...', key: id, duration: 30});
        try {
            await api.exec(id);
            message.success({content: t('general.success'), key: id});
            actionRef.current?.reload();
        } catch (e) {
            message.error({content: t('general.failed'), key: id});
        }
    }

    const handleShowLog = (id: string) => {
        setSelectedRowKey(id);
        setLogOpen(true);
    }

    return (
        <div>
            <NTable
                columns={columns}
                actionRef={actionRef}
                request={async (params = {}, sort, _filter) => {
                    let [sortOrder, sortField] = getSort(sort);
                    
                    let queryParams = {
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        sortOrder: sortOrder,
                        sortField: sortField,
                        name: params.name,
                    }
                    let result = await api.getPaging(queryParams);
                    let items = result['items'];

                    return {
                        data: items,
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
                headerTitle={t('menus.sysops.submenus.scheduled_task')}
                toolBarRender={() => [
                    <Button key="button" type="primary" onClick={() => {
                        setOpen(true)
                    }}>
                        {t('actions.new')}
                    </Button>
                ]}
            />

            <ScheduledTaskModal
                id={selectedRowKey}
                open={open}
                confirmLoading={mutation.isPending}
                handleCancel={() => {
                    setOpen(false);
                    setSelectedRowKey('');
                }}
                handleOk={(values)=>{
                    setValues(values);
                    setMfaOpen(true);
                }}
            />

            <MultiFactorAuthentication
                open={mfaOpen}
                handleOk={async (securityToken) => {
                    setMfaOpen(false);
                    values['securityToken'] = securityToken;
                    mutation.mutate(values);
                }}
                handleCancel={() => setMfaOpen(false)}
            />

            <ScheduledTaskLogPage
                jobId={selectedRowKey}
                open={logOpen}
                handleCancel={() => {
                    setLogOpen(false)
                }}
            />
        </div>
    );
};

export default ScheduledTaskPage;
