import React, {useEffect, useImperativeHandle, useRef, useState} from 'react';
import {
    Alert,
    Button,
    Form,
    type FormInstance,
    Input,
    Radio,
    Select,
    Space,
    Table,
    Tabs,
    Typography,
    type TableColumnType,
    type TableProps
} from 'antd';
import type {SortOrder} from 'antd/es/table/interface';
import {useQuery} from '@tanstack/react-query';
import dayjs from 'dayjs';
import DraggableTable from '@/components/DraggableTable';
import {useTranslation} from 'react-i18next';

export interface NTableActionType {
    reload: () => void;
}

type ValueEnumItem = {
    text?: React.ReactNode;
    status?: string;
};

export type NColumn<T extends object> = TableColumnType<T> & {
    hideInSearch?: boolean;
    hideInTable?: boolean;
    search?: false;
    valueType?: string;
    valueEnum?: Record<string, React.ReactNode | ValueEnumItem>;
    renderFormItem?: (item: NColumn<T>, config: any, form: FormInstance) => React.ReactNode;
    formItemProps?: {
        name?: string;
        [key: string]: any;
    };
    copyable?: boolean;
};

type RequestResult<T> = {
    data?: T[];
    items?: T[];
    total?: number;
    success?: boolean;
};

type SearchConfig = false | {
    labelWidth?: number | 'auto';
};

type ToolbarMenu = {
    type?: 'tab';
    items: Array<{ key: string; label: React.ReactNode }>;
    activeKey?: string;
    onChange?: (activeKey: string) => void;
};

interface NTableProps<T extends object> extends Omit<TableProps<T>, 'columns' | 'title'> {
    columns: NColumn<T>[];
    actionRef?: React.MutableRefObject<NTableActionType | null>;
    request?: (params: Record<string, any>, sort: Record<string, SortOrder>, filter: Record<string, any>) => Promise<RequestResult<T>>;
    headerTitle?: React.ReactNode | false;
    toolBarRender?: () => React.ReactNode[];
    toolbar?: {
        menu?: ToolbarMenu;
        actions?: React.ReactNode[];
    };
    search?: SearchConfig;
    options?: false | {
        search?: boolean;
        [key: string]: any;
    };
    polling?: number;
    params?: Record<string, any>;
    formRef?: React.MutableRefObject<FormInstance | null>;
    form?: {
        initialValues?: Record<string, any>;
        [key: string]: any;
    };
    onSubmit?: (values: Record<string, any>) => void;
    onReset?: () => void;
    columnsState?: any;
    dateFormatter?: string;
    defaultSize?: TableProps<T>['size'];
    tableAlertRender?: (props: {
        selectedRowKeys: React.Key[];
        selectedRows: T[];
        onCleanSelected: () => void;
    }) => React.ReactNode;
    tableAlertOptionRender?: (props: {
        selectedRowKeys: React.Key[];
        selectedRows: T[];
        onCleanSelected: () => void;
    }) => React.ReactNode;
    dragSortKey?: string;
    onDragSortEnd?: (beforeIndex: number, afterIndex: number, newDataSource: T[]) => void;
    cardBordered?: boolean;
}

const getColumnKey = <T extends object, >(column: NColumn<T>) => {
    const key = column.key || column.dataIndex;
    if (Array.isArray(key)) {
        return key.join('.');
    }
    return key ? String(key) : '';
};

const getSearchLabel = <T extends object, >(column: NColumn<T>): React.ReactNode => {
    if (typeof column.title === 'function') {
        return getColumnKey(column);
    }
    return column.title;
};

const getValueEnumText = (item: React.ReactNode | ValueEnumItem) => {
    if (item && typeof item === 'object' && !React.isValidElement(item) && 'text' in item) {
        return item.text;
    }
    return item as React.ReactNode;
};

const normalizeSearchValues = (values: Record<string, any>) => {
    return Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== ''),
    );
};

const buildSearchField = <T extends object, >(column: NColumn<T>, form: any) => {
    if (column.renderFormItem) {
        return column.renderFormItem(column, {type: 'table'}, form);
    }

    if (column.valueEnum) {
        const options = Object.entries(column.valueEnum).map(([value, item]) => ({
            label: getValueEnumText(item),
            value,
        }));
        if (column.valueType === 'radio') {
            return <Radio.Group options={options}/>;
        }
        return <Select allowClear options={options} style={{minWidth: 160}}/>;
    }

    return <Input allowClear/>;
};

const normalizeColumns = <T extends object, >(
    columns: NColumn<T>[],
    pagination: { current: number; pageSize: number },
): TableProps<T>['columns'] => {
    return columns.map((column) => {
        const normalized: TableColumnType<T> = {...column};

        delete (normalized as any).hideInSearch;
        delete (normalized as any).hideInTable;
        delete (normalized as any).search;
        delete (normalized as any).valueType;
        delete (normalized as any).valueEnum;
        delete (normalized as any).renderFormItem;
        delete (normalized as any).formItemProps;
        delete (normalized as any).copyable;

        if (column.valueType === 'indexBorder') {
            normalized.title = normalized.title || '#';
            normalized.render = (_value, _record, index) => ((pagination.current - 1) * pagination.pageSize) + index + 1;
        } else if (column.valueType === 'dateTime' && !column.render) {
            normalized.render = (value) => value ? dayjs(value as number).format('YYYY-MM-DD HH:mm:ss') : '-';
        } else if (column.valueEnum && !column.render) {
            normalized.render = (value) => {
                const item = column.valueEnum?.[String(value)];
                return item ? getValueEnumText(item) : value;
            };
        } else if (column.valueType === 'code' && !column.render) {
            normalized.render = (value) => (
                <Typography.Text code style={{whiteSpace: 'pre-wrap'}}>
                    {value || '-'}
                </Typography.Text>
            );
        } else if (column.copyable && !column.render) {
            normalized.render = (value) => (
                <Typography.Text copyable={value ? {text: String(value)} : false} ellipsis>
                    {value || '-'}
                </Typography.Text>
            );
        }

        return normalized;
    });
};

const NTable = <T extends object, >({
                                       columns,
                                       actionRef,
                                       request,
                                       dataSource,
                                       headerTitle,
                                       toolBarRender,
                                       toolbar,
                                       search,
                                       options,
                                       polling,
                                       params,
                                       formRef,
                                       form: formConfig,
                                       onSubmit,
                                       onReset,
                                       pagination: paginationProp,
                                       rowSelection,
                                       tableAlertRender,
                                       tableAlertOptionRender,
                                       defaultSize,
                                       size,
                                       dragSortKey,
                                       onDragSortEnd,
                                   ...tableProps
                               }: NTableProps<T>) => {
    const {t} = useTranslation();
    const [form] = Form.useForm();
    const tableIdRef = useRef(`n-table-${Math.random().toString(36).slice(2)}`);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: (paginationProp && typeof paginationProp === 'object' && paginationProp.defaultPageSize) || 10,
    });
    const [sort, setSort] = useState<Record<string, SortOrder>>({});
    const [filters, setFilters] = useState<Record<string, any>>({});
    const [keyword, setKeyword] = useState('');
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [selectedRows, setSelectedRows] = useState<T[]>([]);
    const initialValuesKey = JSON.stringify(formConfig?.initialValues || {});

    const query = useQuery({
        queryKey: [tableIdRef.current, params, pagination.current, pagination.pageSize, sort, filters, keyword],
        queryFn: async () => {
            if (!request) {
                return {
                    data: dataSource || [],
                    total: dataSource?.length || 0,
                };
            }
            const result = await request({
                ...params,
                ...filters,
                current: pagination.current,
                pageSize: pagination.pageSize,
                keyword: keyword || undefined,
            }, sort, {});
            return {
                data: result.data || result.items || [],
                total: result.total || 0,
            };
        },
        enabled: !!request,
        refetchInterval: polling,
        refetchOnWindowFocus: false,
    });

    useImperativeHandle(actionRef, () => ({
        reload: () => {
            if (request) {
                query.refetch();
            }
        },
    }));

    useEffect(() => {
        if (formRef) {
            formRef.current = form;
        }
    }, [formRef, form]);

    useEffect(() => {
        if (formConfig?.initialValues) {
            form.setFieldsValue(formConfig.initialValues);
        }
    }, [initialValuesKey, form]);

    useEffect(() => {
        setPagination((prev) => ({...prev, current: 1}));
    }, [params]);

    const reload = () => {
        if (request) {
            query.refetch();
        }
    };

    const handleSearch = async () => {
        const values = await form.validateFields();
        setFilters(normalizeSearchValues(values));
        onSubmit?.(values);
        setPagination((prev) => ({...prev, current: 1}));
    };

    const handleReset = () => {
        form.resetFields();
        setFilters({});
        onReset?.();
        setPagination((prev) => ({...prev, current: 1}));
    };

    const handleSearchValuesChange = (_changedValues: Record<string, any>, allValues: Record<string, any>) => {
        setFilters(normalizeSearchValues(allValues));
        onSubmit?.(allValues);
        setPagination((prev) => ({...prev, current: 1}));
    };

    const handleTableChange: TableProps<T>['onChange'] = (nextPagination, _nextFilters, sorter) => {
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

    const onCleanSelected = () => {
        setSelectedRowKeys([]);
        setSelectedRows([]);
    };

    const mergedRowSelection = rowSelection ? {
        ...rowSelection,
        selectedRowKeys: rowSelection.selectedRowKeys || selectedRowKeys,
        onChange: (keys: React.Key[], rows: T[], info: any) => {
            setSelectedRowKeys(keys);
            setSelectedRows(rows);
            rowSelection.onChange?.(keys, rows, info);
        },
    } : undefined;

    const visibleColumns = columns.filter((column) => !column.hideInTable);

    const searchableColumns = visibleColumns.filter((column) => {
        if (search === false) {
            return false;
        }
        if (column.hideInSearch || column.search === false) {
            return false;
        }
        if (column.valueType === 'option' || column.valueType === 'indexBorder') {
            return false;
        }
        return !!(column.title && getColumnKey(column));
    });

    const toolbarActions = [
        ...(toolBarRender?.() || []),
        ...(toolbar?.actions || []),
    ];

    const tableData = dataSource || (request ? (query.data?.data || []) : []);
    const total = request ? (query.data?.total || 0) : tableData.length;
    const tableColumns = normalizeColumns(visibleColumns, pagination);
    const showSelectionAlert = mergedRowSelection && selectedRowKeys.length > 0 && (tableAlertRender || tableAlertOptionRender);
    const showKeywordSearch = options !== false && options?.search;
    const resolvedTableProps: TableProps<T> = {
        ...tableProps,
        columns: tableColumns,
        dataSource: tableData,
        loading: request ? query.isFetching : tableProps.loading,
        rowSelection: mergedRowSelection,
        pagination: paginationProp === false ? false : {
            current: pagination.current,
            pageSize: pagination.pageSize,
            total,
            showSizeChanger: true,
            ...(paginationProp && typeof paginationProp === 'object' ? paginationProp : {}),
        },
        onChange: handleTableChange,
        size: size || defaultSize || 'small',
    };
    const searchForm = search !== false && searchableColumns.length > 0 && (
        <Form form={form} layout="inline" onFinish={handleSearch} onValuesChange={handleSearchValuesChange}>
            <Space wrap>
                {searchableColumns.map((column) => {
                    const name = column.formItemProps?.name || getColumnKey(column);
                    return (
                        <Form.Item
                            key={name}
                            name={name}
                            label={getSearchLabel(column)}
                            {...column.formItemProps}
                            style={{marginInlineEnd: 0}}
                        >
                            {buildSearchField(column, form)}
                        </Form.Item>
                    );
                })}
            </Space>
        </Form>
    );

    return (
        <div className="overflow-hidden rounded-md bg-white dark:bg-[#141414]">
            {(headerTitle !== false || toolbar?.menu || toolbarActions.length > 0 || showKeywordSearch || searchForm) && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
                    <Space orientation="vertical" size={0}>
                        {headerTitle !== false && headerTitle && <div className="font-medium">{headerTitle}</div>}
                        {toolbar?.menu && (
                            <Tabs
                                size="small"
                                activeKey={toolbar.menu.activeKey}
                                items={toolbar.menu.items}
                                onChange={toolbar.menu.onChange}
                                style={{marginBottom: -12}}
                            />
                        )}
                    </Space>
                    <Space wrap className="justify-end">
                        {searchForm}
                        {showKeywordSearch && search === false && (
                            <Input.Search
                                allowClear
                                placeholder={t('general.search_placeholder')}
                                onSearch={(value) => {
                                    setKeyword(value.trim());
                                    setPagination((prev) => ({...prev, current: 1}));
                                }}
                                style={{width: 240}}
                            />
                        )}
                        {request && (
                            <Button loading={query.isFetching} onClick={reload}>
                                {t('actions.refresh')}
                            </Button>
                        )}
                        {toolbarActions}
                    </Space>
                </div>
            )}

            {showSelectionAlert && (
                <Alert
                    className="mb-3"
                    type="info"
                    showIcon={false}
                    title={
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                {tableAlertRender ? tableAlertRender({selectedRowKeys, selectedRows, onCleanSelected}) : t('general.selected_items', {count: selectedRowKeys.length})}
                            </div>
                            <div>
                                {tableAlertOptionRender?.({selectedRowKeys, selectedRows, onCleanSelected})}
                            </div>
                        </div>
                    }
                />
            )}

            {onDragSortEnd || dragSortKey ? (
                <DraggableTable<T>
                    {...resolvedTableProps}
                    onDragSortEnd={onDragSortEnd}
                />
            ) : (
                <Table<T>
                    {...resolvedTableProps}
                />
            )}
        </div>
    );
};

export default NTable;
