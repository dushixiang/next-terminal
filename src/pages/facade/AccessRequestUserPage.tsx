import {useState} from "react";
import {useMutation, useQuery} from "@tanstack/react-query";
import {
    App,
    Button,
    DatePicker,
    Empty,
    Form,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Select,
    Table,
    type TableProps,
    Tag,
    Tooltip,
    Typography
} from "antd";
import dayjs from "dayjs";
import {Plus} from "lucide-react";
import {useTranslation} from "react-i18next";
import {
    AccessRequest,
    AccessRequestResourceType,
    accessRequestApi,
    CreateAccessRequestRequest
} from "@/api/access-request-api";
import {getSort} from "@/utils/sort";
import {useMobile} from "@/hook/use-mobile";
import {cn} from "@/lib/utils";
import FacadeCompactSearch from "@/pages/facade/components/FacadeCompactSearch";
import {debounce} from "@/utils/debounce";

const {Text} = Typography;

const AccessRequestUserPage = () => {
    const {t} = useTranslation();
    const {message} = App.useApp();
    const {isMobile} = useMobile();
    const [form] = Form.useForm<CreateAccessRequestRequest>();
    const [open, setOpen] = useState(false);
    const [pagination, setPagination] = useState({current: 1, pageSize: 10});
    const [sort, setSort] = useState<Record<string, string | null>>({});
    const [keyword, setKeyword] = useState('');
    const [resourceType, setResourceType] = useState<AccessRequestResourceType>();

    const requestPagingQuery = useQuery({
        queryKey: ['access-requests', pagination.current, pagination.pageSize, sort, keyword],
        queryFn: async () => {
            const [sortOrder, sortField] = getSort(sort);
            return accessRequestApi.paging({
                pageIndex: pagination.current,
                pageSize: pagination.pageSize,
                sortOrder,
                sortField,
                keyword: keyword.trim() || undefined,
            });
        },
        refetchOnWindowFocus: false,
    });

    const reloadTable = debounce(() => {
        requestPagingQuery.refetch();
    }, 300);

    const resourcesQuery = useQuery({
        queryKey: ['access-request-resources', resourceType, open],
        queryFn: () => accessRequestApi.resources(resourceType),
        enabled: open,
        refetchOnWindowFocus: false,
    });

    const createMutation = useMutation({
        mutationFn: (values: CreateAccessRequestRequest) => accessRequestApi.create(values),
        onSuccess: () => {
            setOpen(false);
            form.resetFields();
            requestPagingQuery.refetch();
            message.success(t('general.success'));
        }
    });

    const cancelMutation = useMutation({
        mutationFn: (id: string) => accessRequestApi.cancel(id),
        onSuccess: () => {
            requestPagingQuery.refetch();
            message.success(t('general.success'));
        }
    });

    const statusTag = (status: string, reason?: string) => {
        const map: Record<string, { color: string; label: string }> = {
            pending: {color: 'processing', label: t('access_request.status.pending')},
            approved: {color: 'green', label: t('access_request.status.approved')},
            rejected: {color: 'red', label: t('access_request.status.rejected')},
            cancelled: {color: 'default', label: t('access_request.status.cancelled')},
            closed: {color: 'blue', label: t('access_request.status.closed')},
        };
        const item = map[status] || {color: 'default', label: status};
        if ((status === 'rejected' || status === 'closed') && reason) {
            return (
                <Tooltip title={reason}>
                    <Tag color={item.color}>{item.label}</Tag>
                </Tooltip>
            );
        }
        return <Tag color={item.color}>{item.label}</Tag>;
    };

    const resourceTypeLabel = (value: string) => {
        const map: Record<string, string> = {
            asset: t('access_request.resource_type_asset'),
            database: t('access_request.resource_type_database'),
            website: t('access_request.resource_type_website'),
        };
        return map[value] || value;
    };

    const resourceLabel = (item: {resourceType: AccessRequestResourceType; resourceName: string; groupName?: string; authorised?: boolean}) => {
        const parts = [];
        if (!resourceType) {
            parts.push(resourceTypeLabel(item.resourceType));
        }
        if (item.resourceType !== 'database') {
            parts.push(item.groupName || t('assets.default_group'));
        }
        parts.push(item.resourceName);
        const label = parts.join(' / ');
        return item.authorised ? `${label}（${t('access_request.authorised')}）` : label;
    };

    const handleTableChange: TableProps<AccessRequest>['onChange'] = (nextPagination, _filters, sorter) => {
        const activeSorter = Array.isArray(sorter) ? sorter.find((item) => item.order) : sorter;
        const field = activeSorter?.field;
        const fieldName = Array.isArray(field) ? field.join('.') : field ? String(field) : '';
        setSort(activeSorter?.order && fieldName ? {[fieldName]: activeSorter.order} : {});
        setPagination((prev) => ({
            ...prev,
            current: nextPagination.current || 1,
            pageSize: nextPagination.pageSize || prev.pageSize,
        }));
    };

    const columns: TableProps<AccessRequest>['columns'] = [
        {
            title: t('access_request.resource'),
            dataIndex: 'resourceName',
            ellipsis: true,
            fixed: isMobile ? undefined : 'left',
            render: (text, record) => text || record.resourceId,
        },
        {
            title: t('access_request.resource_type'),
            dataIndex: 'resourceType',
            width: 140,
            render: (value) => resourceTypeLabel(value),
        },
        {
            title: t('access_request.request_reason'),
            dataIndex: 'requestReason',
            ellipsis: true,
            render: (text) => text ? (
                <Tooltip title={text} placement="topLeft">
                    <Text ellipsis style={{maxWidth: 260}}>{text}</Text>
                </Tooltip>
            ) : '-',
        },
        {
            title: t('access_request.duration_minutes'),
            dataIndex: 'durationMinutes',
            width: 150,
        },
        {
            title: t('access_request.start_at_label'),
            dataIndex: 'requestedStartAt',
            width: 180,
            render: (value: number, record: AccessRequest) => {
                const startAt = record.startAt || value;
                return startAt ? dayjs(startAt).format('YYYY-MM-DD HH:mm') : '-';
            },
        },
        {
            title: t('general.status'),
            dataIndex: 'status',
            width: 120,
            render: (_, record) => statusTag(record.status, record.reason),
        },
        {
            title: t('access_request.approver'),
            dataIndex: 'approverName',
            width: 120,
            render: (value) => value || '-',
        },
        {
            title: t('general.created_at'),
            dataIndex: 'createdAt',
            sorter: true,
            width: 180,
            render: (value: number) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-',
        },
        {
            title: t('general.expired_at'),
            dataIndex: 'expiredAt',
            width: 180,
            render: (value: number) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-',
        },
        {
            title: t('actions.label'),
            key: 'option',
            width: 100,
            fixed: isMobile ? undefined : 'right',
            render: (_text, record) => record.status === 'pending' || record.status === 'approved' ? (
                <Popconfirm
                    title={t('access_request.cancel_confirm')}
                    onConfirm={() => cancelMutation.mutate(record.id)}
                >
                    <Button type="link" danger size="small">{t('actions.cancel')}</Button>
                </Popconfirm>
            ) : '-',
        },
    ];

    return (
        <div className={cn('min-h-full px-4 py-5 lg:px-20 lg:py-6', isMobile && 'px-3 py-3')}>
            <div className={'mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'}>
                <div className={'flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center'}>
                    <div className={'truncate text-lg font-semibold leading-7 text-slate-900 dark:text-slate-100'}>
                        {t('menus.work_order.submenus.access_request')}
                    </div>
                    <div className={'w-full sm:w-72 lg:w-80'}>
                        <FacadeCompactSearch
                            value={keyword}
                            placeholder={t('general.search_placeholder')}
                            onChange={(value) => {
                                setKeyword(value);
                                reloadTable();
                            }}
                        />
                    </div>
                </div>
                <Button
                    type="primary"
                    icon={<Plus className={'h-4 w-4'} />}
                    onClick={() => {
                        setResourceType(undefined);
                        form.resetFields();
                        form.setFieldsValue({durationMinutes: 120});
                        setOpen(true);
                    }}
                >
                    {t('access_request.new')}
                </Button>
            </div>

            <Table<AccessRequest>
                rowKey="id"
                columns={columns}
                dataSource={requestPagingQuery.data?.items || []}
                loading={requestPagingQuery.isFetching}
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: requestPagingQuery.data?.total || 0,
                    showSizeChanger: !isMobile,
                    simple: isMobile,
                }}
                onChange={handleTableChange}
                scroll={{x: 'max-content'}}
            />

            <Modal
                title={t('access_request.new')}
                open={open}
                onCancel={() => setOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={createMutation.isPending}
                            destroyOnHidden
            >
                <Form<CreateAccessRequestRequest>
                    form={form}
                    layout="vertical"
                    initialValues={{durationMinutes: 120}}
                    onFinish={(values) => createMutation.mutate(values)}
                >
                    <Form.Item label={t('access_request.resource_type')} name="resourceType" rules={[{required: true}]}>
                        <Select
                            allowClear
                            options={[
                                {value: 'asset', label: t('access_request.resource_type_asset')},
                                {value: 'database', label: t('access_request.resource_type_database')},
                                {value: 'website', label: t('access_request.resource_type_website')},
                            ]}
                            onChange={(value) => {
                                setResourceType(value);
                                form.setFieldValue('resourceId', undefined);
                            }}
                        />
                    </Form.Item>
                    <Form.Item label={t('access_request.resource')} name="resourceId" rules={[{required: true}]}>
                        <Select
                            showSearch={{
                                filterOption: (input, option) =>
                                    (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase()),
                            }}
                            allowClear
                            loading={resourcesQuery.isFetching}
                            options={(resourcesQuery.data || []).map(item => {
                                return {
                                    value: item.resourceId,
                                    label: resourceLabel(item),
                                    disabled: item.authorised,
                                };
                            })}
                            notFoundContent={
                                resourcesQuery.isFetching ? t('general.loading') : (
                                    <Empty
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        description={t('access_request.requestable_resource_empty')}
                                    />
                                )
                            }
                            onChange={(value) => {
                                const selected = (resourcesQuery.data || []).find(item => item.resourceId === value);
                                if (selected && selected.resourceType !== resourceType) {
                                    setResourceType(selected.resourceType);
                                    form.setFieldValue('resourceType', selected.resourceType);
                                }
                            }}
                        />
                    </Form.Item>
                    <Form.Item label={t('access_request.duration_minutes')} name="durationMinutes" rules={[{required: true}]}>
                        <InputNumber min={1} max={1440} style={{width: '100%'}} />
                    </Form.Item>
                    <Form.Item label={t('access_request.start_at')} name="startAt" getValueProps={(value?: number) => ({value: value ? dayjs(value) : undefined})} normalize={(value?: dayjs.Dayjs) => value?.valueOf()}>
                        <DatePicker showTime style={{width: '100%'}} disabledDate={(date) => date.isBefore(dayjs(), 'day')} />
                    </Form.Item>
                    <Form.Item label={t('access_request.request_reason')} name="requestReason" rules={[{required: true}]}>
                        <Input.TextArea rows={4} placeholder={t('access_request.request_reason_placeholder')} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default AccessRequestUserPage;
