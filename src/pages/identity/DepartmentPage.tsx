import React, {useRef, useState} from 'react';

import {Button, message, Tag, Tree} from "antd";
import {ActionType, ProColumns, ProTable, TableDropdown} from "@ant-design/pro-components";
import DepartmentModal from "./DepartmentModal";
import {useNavigate} from "react-router-dom";
import departmentApi, {Department} from '@/api/department-api';
import {useTranslation} from "react-i18next";
import {getSort} from "@/utils/sort";
import {useMutation, useQuery} from "@tanstack/react-query";
import NLink from "@/components/NLink";
import NButton from "@/components/NButton";
import DepartmentUserModal from "@/pages/identity/DepartmentUserModal";

const api = departmentApi;

const DepartmentPage = () => {

    const {t} = useTranslation();
    const actionRef = useRef<ActionType>(null);

    let [open, setOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>();
    let [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
    let [userModalOpen, setUserModalOpen] = useState<boolean>(false);
    let [selectedDepartment, setSelectedDepartment] = useState<Department>();

    let navigate = useNavigate();

    const [messageApi, contextHolder] = message.useMessage();

    // 获取部门树数据
    const {data: treeData, refetch: refetchTree} = useQuery({
        queryKey: ['department-tree'],
        queryFn: () => api.getTree(),
        enabled: viewMode === 'tree'
    });

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
            refetchTree();
            setOpen(false);
            setSelectedRowKey(undefined);
            showSuccess();
        }
    });

    // 删除部门的mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteById(id),
        onSuccess: () => {
            actionRef.current?.reload();
            refetchTree();
            showSuccess();
        },
        onError: () => {
            messageApi.error(t('general.error'));
        }
    });

    function showSuccess() {
        messageApi.open({
            type: 'success',
            content: t('general.success'),
        });
    }

    const columns: ProColumns<Department>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('general.name'),
            dataIndex: 'name',
            render: (text, record) => {
                return <a onClick={() => {
                    setOpen(true);
                    setSelectedRowKey(record.id);
                }}>{text}</a>;
            },
        },
        {
            title: t('identity.department.parent'),
            dataIndex: 'parentId',
            hideInSearch: true,
            render: (text, record) => {
                return record.parentId ? (
                    <Tag color="blue">{record.parentName}</Tag>
                ) : (
                    <Tag color="green">{t('identity.department.root')}</Tag>
                );
            },
        },
        {
            title: t('identity.department.user_count'),
            dataIndex: 'userCount',
            hideInSearch: true,
            width: 100,
        },
        {
            title: t('assets.sort'),
            dataIndex: 'weight',
            hideInSearch: true,
            width: 100,
        },
        {
            title: t('general.created_at'),
            key: 'createdAt',
            dataIndex: 'createdAt',
            valueType: 'dateTime',
            hideInSearch: true,
            width: 191,
        },
        {
            title: t('actions.label'),
            valueType: 'option',
            key: 'option',
            width: 160,
            render: (text, record, _, action) => [
                <NButton key="edit" onClick={() => {
                    setSelectedRowKey(record.id);
                    setOpen(true);
                }}>
                    {t('actions.edit')}
                </NButton>,
                <NButton key="manage-users" onClick={() => {
                    setSelectedDepartment(record);
                    setUserModalOpen(true);
                }}>
                    {t('identity.department.manage_users')}
                </NButton>,
                <NButton key="delete"
                         onClick={() => {
                             deleteMutation.mutate(record.id);
                         }}
                         danger={true}
                >
                    {t('actions.delete')}
                </NButton>,
                <TableDropdown
                    key="more"
                    onSelect={(key) => {
                        switch (key) {
                            case 'view-authorised-asset':
                                navigate(`/authorised-asset?departmentId=${record.id}`);
                                break;
                            case 'view-authorised-website':
                                navigate(`/authorised-website?departmentId=${record.id}`);
                                break;
                        }
                    }}
                    menus={[
                        {key: 'view-authorised-asset', name: `${t('menus.resource.submenus.asset')}${t('actions.authorized')}`},
                        {key: 'view-authorised-website', name: `${t('menus.resource.submenus.website')}${t('actions.authorized')}`},
                    ]}
                />,
            ],
        },
    ];

    return (<div>
        <div style={{marginLeft: 16}}>
            <Button.Group>
                <Button
                    type={viewMode === 'table' ? 'primary' : 'default'}
                    onClick={() => setViewMode('table')}
                >
                    {t('identity.department.table_view')}
                </Button>
                <Button
                    type={viewMode === 'tree' ? 'primary' : 'default'}
                    onClick={() => setViewMode('tree')}
                >
                    {t('identity.department.tree_view')}
                </Button>
            </Button.Group>
        </div>

        {viewMode === 'table' ? (
            <ProTable
                columns={columns}
                actionRef={actionRef}
                request={async (params = {}, sort, filter) => {
                    let [sortOrder, sortField] = getSort(sort);

                    let queryParams = {
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        sortOrder: sortOrder,
                        sortField: sortField,
                        name: params.name,
                    }
                    let result = await api.getPaging(queryParams);
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
                headerTitle={t('menus.identity.submenus.department')}
                toolBarRender={() => [
                    <Button key="button" type="primary" onClick={() => {
                        setOpen(true)
                    }}>
                        {t('actions.new')}
                    </Button>
                ]}
            />
        ) : (
            <div style={{background: '#fff', padding: 24, borderRadius: 8}}>
                <div style={{marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h3>{t('identity.department.tree_structure')}</h3>
                    <Button type="primary" onClick={() => setOpen(true)}>
                        {t('actions.new')}
                    </Button>
                </div>
                {treeData && (
                    <Tree
                        showLine
                        showIcon
                        defaultExpandAll
                        treeData={treeData}
                        onSelect={(selectedKeys) => {
                            if (selectedKeys.length > 0) {
                                navigate(`/department/${selectedKeys[0]}`);
                            }
                        }}
                    />
                )}
            </div>
        )}

        <DepartmentModal
            id={selectedRowKey}
            open={open}
            confirmLoading={mutation.isPending}
            handleCancel={() => {
                setOpen(false);
                setSelectedRowKey(undefined);
            }}
            handleOk={mutation.mutate}
        />

        <DepartmentUserModal
            departmentId={selectedDepartment?.id}
            departmentName={selectedDepartment?.name}
            open={userModalOpen}
            confirmLoading={false}
            handleCancel={() => {
                setUserModalOpen(false);
                setSelectedDepartment(undefined);
            }}
            handleOk={() => {
                setUserModalOpen(false);
                setSelectedDepartment(undefined);
                actionRef.current?.reload();
            }}
        />
        {contextHolder}
    </div>);
}

export default DepartmentPage;
