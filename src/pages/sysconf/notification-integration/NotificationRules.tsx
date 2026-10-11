import {useEffect, useRef, useState} from "react";
import {
    App,
    Button,
    Checkbox,
    Divider,
    Form,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Popover,
    Select,
    Space,
    Switch,
    Tag,
    Typography
} from "antd";
import {Plus} from "lucide-react";
import {useMutation, useQuery} from "@tanstack/react-query";
import {notificationChannelApi, NotificationRule, notificationRuleApi} from "@/api/notification-api";
import NTable, {NColumn, NTableActionType} from "@/components/NTable";
import {getSort} from "@/utils/sort";
import {channelTypeLabel, eventGroupLabel, eventGroups, eventTypeLabel} from "./constants";
import {useTranslation} from "react-i18next";

const NotificationRules = () => {
    const {t} = useTranslation();
    const {message} = App.useApp();
    const actionRef = useRef<NTableActionType>(null);
    const [open, setOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string>();

    const saveMutation = useMutation({
        mutationFn: async (values: NotificationRule) => {
            if (values.id) {
                await notificationRuleApi.updateById(values.id, values);
                return;
            }
            await notificationRuleApi.create(values);
        },
        onSuccess: () => {
            message.success(t('general.success'));
            setOpen(false);
            setSelectedId(undefined);
            actionRef.current?.reload();
        }
    });

    const columns: NColumn<NotificationRule>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('general.name'),
            dataIndex: 'name',
            ellipsis: true,
        },
        {
            title: t('settings.notification.event_types_label'),
            dataIndex: 'eventTypes',
            hideInSearch: true,
            width: 360,
            render: (_text, record) => {
                const eventTypes = record.eventTypes || [];
                return <div className="flex flex-wrap items-center gap-1">
                    {eventTypes.slice(0, 2).map(item => <Tag key={item} style={{marginInlineEnd: 0, maxWidth: '100%'}}>
                        <span className="block truncate"
                              title={eventTypeLabel(item, t)}>{eventTypeLabel(item, t)}</span>
                    </Tag>)}
                    {eventTypes.length > 2 && <Popover
                        title={t('settings.notification.event_types_label')}
                        trigger="click"
                        content={<div className="space-y-3" style={{
                            width: 'min(480px, calc(100vw - 64px))',
                            maxHeight: 320,
                            overflowY: 'auto'
                        }}>
                            {eventGroups.map(group => {
                                const selectedEvents = group.events.filter(item => eventTypes.includes(item));
                                if (selectedEvents.length === 0) {
                                    return null;
                                }
                                return <div key={group.key}>
                                    <Typography.Text strong>{eventGroupLabel(group.key, t)}</Typography.Text>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {selectedEvents.map(item => <Tag key={item} style={{marginInlineEnd: 0, whiteSpace: 'normal', overflowWrap: 'anywhere'}}>
                                            {eventTypeLabel(item, t)}
                                        </Tag>)}
                                    </div>
                                </div>;
                            })}
                            <div className="flex flex-wrap gap-1">
                                {eventTypes.filter(item => !eventGroups.some(group => group.events.includes(item))).map(item => <Tag
                                    key={item} style={{marginInlineEnd: 0, whiteSpace: 'normal', overflowWrap: 'anywhere'}}
                                >{eventTypeLabel(item, t)}</Tag>)}
                            </div>
                        </div>}
                    >
                        <Button type="link" size="small"
                                aria-label={`${t('settings.notification.event_types_label')} (+${eventTypes.length - 2})`}>
                            +{eventTypes.length - 2}
                        </Button>
                    </Popover>}
                </div>;
            },
        },
        {
            title: t('general.status'),
            dataIndex: 'enabled',
            hideInSearch: true,
            width: 100,
            render: (_text, record) => record.enabled ?
                <Tag color="success">{t('general.enabled')}</Tag> :
                <Tag>{t('general.disabled')}</Tag>,
        },
        {
            title: t('actions.label'),
            valueType: 'option',
            width: 160,
            fixed: 'end',
            render: (_text, record) => <Space>
                <Button size="small"
                        type={'link'}
                        style={{margin: 0, padding: 0}}
                        onClick={() => {
                            setSelectedId(record.id);
                            setOpen(true);
                        }}>
                    {t('actions.edit')}
                </Button>
                <Popconfirm title={t('general.confirm_delete')} onConfirm={async () => {
                    await notificationRuleApi.deleteById(record.id);
                    actionRef.current?.reload();
                }}>
                    <Button size="small"
                            type={'link'}
                            style={{margin: 0, padding: 0}}
                            danger>
                        {t('actions.delete')}
                    </Button>
                </Popconfirm>
            </Space>,
        },
    ];

    return <div>
        <Typography.Paragraph type="secondary">{t('settings.notification.rules_extra_tip')}</Typography.Paragraph>
        <NTable
            columns={columns}
            tableLayout="fixed"
            scroll={{x: 1100}}
            actionRef={actionRef}
            request={async (params = {}, sort) => {
                const [sortOrder, sortField] = getSort(sort);
                const result = await notificationRuleApi.getPaging({
                    pageIndex: params.current,
                    pageSize: params.pageSize,
                    sortOrder,
                    sortField,
                    name: params.name,
                });
                return {data: result.items, success: true, total: result.total};
            }}
            rowKey="id"
            search={{labelWidth: 'auto'}}
            pagination={{defaultPageSize: 10, showSizeChanger: true}}
            dateFormatter="string"
            headerTitle={t('settings.notification.rules')}
            toolBarRender={() => [
                <Button key="new" type="primary" icon={<Plus size={16}/>} onClick={() => setOpen(true)}>
                    {t('actions.new')}
                </Button>
            ]}
        />
        <NotificationRuleModal
            id={selectedId}
            open={open}
            confirmLoading={saveMutation.isPending}
            onCancel={() => {
                setOpen(false);
                setSelectedId(undefined);
            }}
            onOk={saveMutation.mutate}
        />
    </div>;
};

const EventTypesSelect = ({value = [], onChange}: {
    value?: string[];
    onChange?: (value: string[]) => void;
}) => {
    const {t} = useTranslation();
    const groups = eventGroups;
    const allEvents = groups.flatMap(group => group.events);
    const selectedCount = allEvents.filter(item => value.includes(item)).length;

    const updateGroup = (events: string[], selected: string[]) => {
        onChange?.([...value.filter(item => !events.includes(item)), ...selected]);
    };

    return <div className="space-y-3">
        <Checkbox
            checked={selectedCount === allEvents.length}
            indeterminate={selectedCount > 0 && selectedCount < allEvents.length}
            onChange={event => updateGroup(allEvents, event.target.checked ? allEvents : [])}
        >
            {t('dw.select_all')} ({selectedCount}/{allEvents.length})
        </Checkbox>
        {groups.map(group => {
            const selectedEvents = group.events.filter(item => value.includes(item));
            return <div key={group.key}>
                <Divider style={{margin: '8px 0'}}/>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <Typography.Text strong>{eventGroupLabel(group.key, t)}</Typography.Text>
                    <Checkbox
                        checked={selectedEvents.length === group.events.length}
                        indeterminate={selectedEvents.length > 0 && selectedEvents.length < group.events.length}
                        onChange={event => updateGroup(group.events, event.target.checked ? group.events : [])}
                    >
                        {t('dw.select_all')} ({selectedEvents.length}/{group.events.length})
                    </Checkbox>
                </div>
                <Checkbox.Group
                    style={{width: '100%'}}
                    value={selectedEvents}
                    onChange={selected => updateGroup(group.events, selected)}
                >
                    <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2 xl:grid-cols-4">
                        {group.events.map(item => <Checkbox key={item} value={item}>
                            {eventTypeLabel(item, t)}
                        </Checkbox>)}
                    </div>
                </Checkbox.Group>
            </div>;
        })}
    </div>;
};

const NotificationRuleModal = ({
                                   id,
                                   open,
                                   confirmLoading,
                                   onCancel,
                                   onOk,
                               }: {
    id?: string;
    open: boolean;
    confirmLoading: boolean;
    onCancel: () => void;
    onOk: (values: NotificationRule) => void;
}) => {
    const {t} = useTranslation();
    const [form] = Form.useForm();
    const channelsQuery = useQuery({
        queryKey: ['notification-channels'],
        queryFn: notificationChannelApi.getAll,
        enabled: open,
    });
    const ruleQuery = useQuery({
        queryKey: ['notification-rule', id],
        queryFn: () => notificationRuleApi.getById(id!),
        enabled: open && !!id,
    });

    useEffect(() => {
        if (!open) {
            return;
        }
        form.resetFields();
        if (!id) {
            form.setFieldsValue({
                enabled: true,
                eventTypes: [],
                channelIds: [],
                quietMinutes: 0,
                conditions: {},
            });
            return;
        }
        if (ruleQuery.data) {
            form.setFieldsValue(ruleQuery.data);
        }
    }, [form, id, open, ruleQuery.data]);

    const handleOk = async () => {
        const values = await form.validateFields();
        onOk({...values, deliveryTarget: 'channel', recipientMode: '', recipientIds: [], id} as NotificationRule);
    };

    return <Modal
        title={id ? t('settings.notification.edit_rule') : t('settings.notification.new_rule')}
        open={open}
        confirmLoading={confirmLoading}
        onCancel={onCancel}
        onOk={handleOk}
        destroyOnHidden
        width={960}
    >
        <Form form={form} layout="vertical">
            <Form.Item name="name" label={t('general.name')} rules={[{required: true}]}>
                <Input/>
            </Form.Item>
            <Form.Item name="enabled" label={t('general.status')} valuePropName="checked">
                <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
            </Form.Item>
            <Form.Item name="eventTypes" label={t('settings.notification.event_types_label')} rules={[{required: true}]}>
                <EventTypesSelect/>
            </Form.Item>
            <Form.Item name="channelIds" label={t('settings.notification.channels')} rules={[{required: true}]}>
                <Select mode="multiple" loading={channelsQuery.isLoading}
                        options={(channelsQuery.data || []).map(item => ({
                            label: channelTypeLabel(item.type, t),
                            value: item.type,
                        }))}/>
            </Form.Item>
            <Form.Item name="quietMinutes" label={t('settings.notification.quiet_minutes')}
                       extra={t('settings.notification.work_order_quiet_tip')}>
                <InputNumber min={0} precision={0} style={{width: '100%'}}/>
            </Form.Item>
        </Form>
    </Modal>;
};

export default NotificationRules;
