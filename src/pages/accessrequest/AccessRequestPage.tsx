import {accessRequestReason} from "./access-request-text";
import {useState} from "react";
import AccessRequestDetailDrawer from "./AccessRequestDetailDrawer";
import {useMutation, useQuery} from "@tanstack/react-query";
import {
    App,
    Button,
    Drawer,
    Form,
    Modal,
    Popconfirm,
    Select,
    Space,
    Table,
    type TableProps,
    type TreeDataNode,
    Tag,
    Tooltip,
    Typography
} from "antd";
import dayjs from "dayjs";
import React from "react";
import {useTranslation} from "react-i18next";
import {
    AccessRequest,
    AccessRequestResourceType,
    accessRequestAdminApi,
    type AccessRequestScope
} from "@/api/access-request-api";
import {AssetGroupTreeSelect, DatabaseAssetSelect, DepartmentTreeSelect, UserSelect, WebsiteGroupTreeSelect} from "@/components/shared/QuerySelects";
import departmentApi from "@/api/department-api";
import assetApi from "@/api/asset-api";
import websiteApi from "@/api/website-api";
import databaseAssetApi from "@/api/database-asset-api";
import {getSort} from "@/utils/sort";

const {Text} = Typography;

const collectNames = (nodes: TreeDataNode[], names: Record<string, string> = {}, parent = ''): Record<string, string> => {
    for (const node of nodes) {
        const title = typeof node.title === 'function' ? node.title(node) : node.title;
        const name = String(title ?? node.key);
        const path = parent ? `${parent} / ${name}` : name;
        names[String(node.key)] = path;
        collectNames(node.children || [], names, path);
    }
    return names;
};

const AccessRequestPage = () => {
    const {t} = useTranslation();
    const {message} = App.useApp();
    const [detailId, setDetailId] = useState<string>();
    const [scopeForm] = Form.useForm<AccessRequestScope>();
    const [scopeOpen, setScopeOpen] = useState(false);
    const [scopeEditOpen, setScopeEditOpen] = useState(false);
    const [pagination, setPagination] = useState({current: 1, pageSize: 10});
    const [sort, setSort] = useState<Record<string, string | null>>({});
    const [status, setStatus] = useState<string>();
    const [resourceType, setResourceType] = useState<AccessRequestResourceType>();
    const [requesterId, setRequesterId] = useState<string>();


    const scopesQuery = useQuery({
        queryKey: ['access-request-scopes'],
        queryFn: accessRequestAdminApi.scopes,
        enabled: scopeOpen,
    });
    const scopeNamesQuery = useQuery({
        queryKey: ['access-request-scope-names'],
        queryFn: async () => {
            const [departments, assetGroups, websiteGroups, databases] = await Promise.all([
                departmentApi.getTree(), assetApi.getGroups(), websiteApi.getGroups(), databaseAssetApi.getAll(),
            ]);
            return {
                departments: collectNames(departments),
                assetGroups: collectNames(assetGroups),
                websiteGroups: collectNames(websiteGroups),
                databases: Object.fromEntries(databases.map(item => [item.id, item.name])),
            };
        },
        enabled: scopeOpen,
    });
    const scopeMutation = useMutation({
        mutationFn: accessRequestAdminApi.setScope,
        onSuccess: () => {
            scopesQuery.refetch();
            setScopeEditOpen(false);
            scopeForm.resetFields();
            message.success(t('general.success'));
        },
    });
    const deleteScopeMutation = useMutation({
        mutationFn: accessRequestAdminApi.deleteScope,
        onSuccess: () => {
            scopesQuery.refetch();
            message.success(t('general.success'));
        },
    });

    const editScope = (scope?: AccessRequestScope) => {
        scopeForm.setFieldsValue({
            departmentId: scope?.departmentId,
            assetGroupIds: scope?.assetGroupIds || [],
            websiteGroupIds: scope?.websiteGroupIds || [],
            databaseAssetIds: scope?.databaseAssetIds || [],
        });
        setScopeEditOpen(true);
    };

    const scopeNames = scopeNamesQuery.data;
    const renderScopeNames = (ids: string[] | undefined, names: Record<string, string> | undefined) =>
        ids?.length ? ids.map(id => names?.[id] || id).join('、') : t('access_request.scope_empty');

    const requestPagingQuery = useQuery({
        queryKey: ['admin-access-requests', pagination.current, pagination.pageSize, sort, status, resourceType, requesterId],
        queryFn: async () => {
            const [sortOrder, sortField] = getSort(sort);
            return accessRequestAdminApi.paging({
                pageIndex: pagination.current,
                pageSize: pagination.pageSize,
                sortOrder,
                sortField,
                status: status || undefined,
                resourceType: resourceType || undefined,
                requesterId: requesterId || undefined,
            });
        },
        refetchOnWindowFocus: false,
    });

    const reloadTable = () => {
        requestPagingQuery.refetch();
    };

    const cancelMutation = useMutation({
        mutationFn: (id: string) => accessRequestAdminApi.cancel(id),
        onSuccess: () => {
            reloadTable();
            message.success(t('general.success'));
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => accessRequestAdminApi.deleteById(id),
        onSuccess: () => {
            reloadTable();
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
        const item = map[status] || {color: 'default', label: t('access_request.unknown_status', {status})};
        if ((status === 'rejected' || status === 'closed') && reason) {
            return (
                <Tooltip title={accessRequestReason(status, reason, t)}>
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

    const statusOptions = [
        {value: 'pending', label: t('access_request.status.pending')},
        {value: 'approved', label: t('access_request.status.approved')},
        {value: 'rejected', label: t('access_request.status.rejected')},
        {value: 'cancelled', label: t('access_request.status.cancelled')},
        {value: 'closed', label: t('access_request.status.closed')},
    ];

    const resourceTypeOptions = [
        {value: 'asset', label: t('access_request.resource_type_asset')},
        {value: 'database', label: t('access_request.resource_type_database')},
        {value: 'website', label: t('access_request.resource_type_website')},
    ];

    const columns: TableProps<AccessRequest>['columns'] = [
        {
            title: t('access_request.resource'),
            dataIndex: 'resourceName',
            ellipsis: true,
            fixed: 'left',
            render: (text, record) => text || record.resourceId,
        },
        {
            title: t('access_request.resource_type'),
            dataIndex: 'resourceType',
            width: 140,
            render: (value) => resourceTypeLabel(value),
        },
        {
            title: t('access_request.requester'),
            dataIndex: 'requesterName',
            width: 120,
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
            width: 210,
            fixed: 'right',
            render: (_text, record) => {
                const actions = [] as React.ReactNode[];
                if (record.status === 'pending') {
                    actions.push(
                        <Button key="review" type="link" size="small" onClick={() => setDetailId(record.id)}>
                            {t('access_request.review')}
                        </Button>
                    );
                }
                if (record.status !== 'pending') {
                    actions.push(
                        <Button key="detail" type="link" size="small" onClick={() => setDetailId(record.id)}>
                            {t('actions.detail')}
                        </Button>
                    );
                }
                if (record.status === 'pending' || record.status === 'approved') {
                    actions.push(
                        <Popconfirm
                            key="cancel"
                            title={t('access_request.cancel_confirm')}
                            onConfirm={() => cancelMutation.mutate(record.id)}
                        >
                            <Button type="link" danger size="small">{t('actions.cancel')}</Button>
                        </Popconfirm>
                    );
                }
                if (record.status !== 'approved') {
                    actions.push(
                        <Popconfirm
                            key="delete"
                            title={t('general.confirm_delete')}
                            onConfirm={() => deleteMutation.mutate(record.id)}
                        >
                            <Button type="link" danger size="small">{t('actions.delete')}</Button>
                        </Popconfirm>
                    );
                }
                return actions.length ? <Space size={4}>{actions}</Space> : '-';
            },
        },
    ];

    return (
        <div>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="font-medium">{t('menus.work_order.submenus.access_request')}</div>
                <Space wrap>
                    <Button onClick={() => setScopeOpen(true)}>{t('access_request.scope_title')}</Button>
                    <Select
                        allowClear
                        placeholder={t('general.status')}
                        value={status}
                        options={statusOptions}
                        style={{width: 140}}
                        onChange={(value) => {
                            setStatus(value);
                            setPagination((prev) => ({...prev, current: 1}));
                        }}
                    />
                    <Select
                        allowClear
                        placeholder={t('access_request.resource_type')}
                        value={resourceType}
                        options={resourceTypeOptions}
                        style={{width: 160}}
                        onChange={(value) => {
                            setResourceType(value);
                            setPagination((prev) => ({...prev, current: 1}));
                        }}
                    />
                    <UserSelect
                        allowClear
                        value={requesterId}
                        style={{width: 180}}
                        onChange={(value) => {
                            setRequesterId(value);
                            setPagination((prev) => ({...prev, current: 1}));
                        }}
                    />
                </Space>
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
                    showSizeChanger: true,
                }}
                onChange={handleTableChange}
                scroll={{x: 'max-content'}}
            />

            <AccessRequestDetailDrawer id={detailId} onClose={() => setDetailId(undefined)} />

            <Drawer
                title={t('access_request.scope_title')}
                extra={<Button type="primary" onClick={() => editScope()}>{t('access_request.scope_new')}</Button>}
                open={scopeOpen}
                onClose={() => setScopeOpen(false)}
                size="min(1100px, 100vw)"
            >
                <div className="mb-4 text-sm text-gray-500">{t('access_request.scope_unconfigured_tip')}</div>
                <Table<AccessRequestScope>
                    rowKey="departmentId"
                    loading={scopesQuery.isFetching || scopeNamesQuery.isFetching}
                    dataSource={scopesQuery.data || []}
                    pagination={{pageSize: 10}}
                    scroll={{x: 800}}
                    columns={[
                        {
                            title: t('menus.identity.submenus.department'),
                            dataIndex: 'departmentId',
                            width: 180,
                            render: (id: string) => scopeNames?.departments[id] || id,
                        },
                        {
                            title: t('access_request.asset_groups'),
                            dataIndex: 'assetGroupIds',
                            ellipsis: true,
                            render: (ids: string[]) => renderScopeNames(ids, scopeNames?.assetGroups),
                        },
                        {
                            title: t('access_request.website_groups'),
                            dataIndex: 'websiteGroupIds',
                            ellipsis: true,
                            render: (ids: string[]) => renderScopeNames(ids, scopeNames?.websiteGroups),
                        },
                        {
                            title: t('access_request.databases'),
                            dataIndex: 'databaseAssetIds',
                            ellipsis: true,
                            render: (ids: string[]) => renderScopeNames(ids, scopeNames?.databases),
                        },
                        {
                            title: t('actions.label'),
                            width: 96,
                            render: (_, scope) => <Space size={0}>
                                <Button type="link" size="small" style={{paddingInline: 2}} onClick={() => editScope(scope)}>{t('actions.edit')}</Button>
                                <Popconfirm
                                    title={t('access_request.scope_delete_confirm')}
                                    onConfirm={() => deleteScopeMutation.mutate(scope.departmentId)}
                                >
                                    <Button type="link" size="small" style={{paddingInline: 2}} danger loading={deleteScopeMutation.isPending}>{t('actions.delete')}</Button>
                                </Popconfirm>
                            </Space>,
                        },
                    ]}
                />

                <Modal
                    title={t('access_request.scope_title')}
                    open={scopeEditOpen}
                    onCancel={() => { setScopeEditOpen(false); scopeForm.resetFields(); }}
                    onOk={() => scopeForm.submit()}
                    confirmLoading={scopeMutation.isPending}
                    forceRender
                >
                    <Form<AccessRequestScope>
                        form={scopeForm}
                        layout="vertical"
                        preserve={false}
                        onFinish={(values) => scopeMutation.mutate({
                            ...values,
                            assetGroupIds: values.assetGroupIds || [],
                            websiteGroupIds: values.websiteGroupIds || [],
                            databaseAssetIds: values.databaseAssetIds || [],
                        })}
                    >
                        <Form.Item name="departmentId" label={t('menus.identity.submenus.department')} rules={[{required: true}]}>
                            <DepartmentTreeSelect style={{width: '100%'}} onChange={(departmentId: string) => {
                                const scope = scopesQuery.data?.find(item => item.departmentId === departmentId);
                                scopeForm.setFieldsValue({
                                    assetGroupIds: scope?.assetGroupIds || [],
                                    websiteGroupIds: scope?.websiteGroupIds || [],
                                    databaseAssetIds: scope?.databaseAssetIds || [],
                                });
                            }} />
                        </Form.Item>
                        <Form.Item name="assetGroupIds" label={t('access_request.asset_groups')}>
                            <AssetGroupTreeSelect multiple style={{width: '100%'}} />
                        </Form.Item>
                        <Form.Item name="websiteGroupIds" label={t('access_request.website_groups')}>
                            <WebsiteGroupTreeSelect multiple style={{width: '100%'}} />
                        </Form.Item>
                        <Form.Item name="databaseAssetIds" label={t('access_request.databases')}>
                            <DatabaseAssetSelect mode="multiple" style={{width: '100%'}} />
                        </Form.Item>
                        <div className="text-sm text-gray-500">{t('access_request.scope_tip')}</div>
                    </Form>
                </Modal>
            </Drawer>

        </div>
    );
};

export default AccessRequestPage;
