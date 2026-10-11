import { useRef,useState } from 'react';

import departmentApi,{ Department, TreeNode } from '@/api/department-api';
import { DragHandle } from "@/components/DraggableTable";
import type { TreeProps } from "antd";
import NButton from "@/components/NButton";
import NLink from "@/components/NLink";
import NTable,{ type NColumn,type NTableActionType } from "@/components/NTable";
import DepartmentUserModal from "@/pages/identity/DepartmentUserModal";
import { getSort } from "@/utils/sort";
import { useMutation,useQuery } from "@tanstack/react-query";
import { Button,Dropdown,message,Space,Tag,Tree } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import DepartmentModal from "./DepartmentModal";

const api = departmentApi;

const DepartmentPage = () => {

    const {t} = useTranslation();
    const actionRef = useRef<NTableActionType>(null);

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

    const sortMutation = useMutation({
        mutationFn: ({id, beforeId, afterId, parentId}: {id: string; beforeId?: string; afterId?: string; parentId?: string}) =>
            api.updateSort(id, beforeId, afterId, parentId),
        onSuccess: () => {
            actionRef.current?.reload();
            refetchTree();
            showSuccess();
        },
        onError: () => {
            actionRef.current?.reload();
            refetchTree();
            messageApi.error(t('general.error'));
        },
    });

    const findTreeNode = (nodes: TreeNode[], key: string, parentId = ''):
        {node: TreeNode; siblings: TreeNode[]; parentId: string} | undefined => {
        for (const node of nodes) {
            if (node.key === key) return {node, siblings: nodes, parentId};
            const found = findTreeNode(node.children || [], key, node.key);
            if (found) return found;
        }
    };

    const canDrop = (dragKey: string, dropKey: string) => {
        const dragged = findTreeNode(treeData || [], dragKey);
        return !!dragged && !findTreeNode([dragged.node], dropKey);
    };

    const handleTreeDrop: TreeProps['onDrop'] = info => {
        const id = String(info.dragNode.key);
        const dropKey = String(info.node.key);
        if (sortMutation.isPending || !canDrop(id, dropKey)) return;
        const target = findTreeNode(treeData || [], dropKey);
        if (!target) return;
        if (!info.dropToGap) {
            const children = (target.node.children || []).filter(node => node.key !== id);
            sortMutation.mutate({id, parentId: dropKey, afterId: children[0]?.key});
            return;
        }
        const items = target.siblings.filter(node => node.key !== id);
        const targetIndex = items.findIndex(node => node.key === dropKey);
        const position = Number(info.node.pos.split('-').pop());
        const index = targetIndex + (info.dropPosition - position > 0 ? 1 : 0);
        sortMutation.mutate({
            id,
            parentId: target.parentId,
            beforeId: items[index - 1]?.key,
            afterId: items[index]?.key,
        });
    };

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

    const columns: NColumn<Department>[] = [
        {
            title: t('assets.sort'),
            dataIndex: 'sort',
            hideInSearch: true,
            width: 60,
            render: () => <DragHandle title={t('assets.sort')}/>,
        },
        {
            title: t('general.name'),
            dataIndex: 'name',
            render: (text, record) => {
                return <NLink to={`/department/${record.id}`}>{text}</NLink>;
            },
        },
        {
            title: t('identity.department.parent'),
            dataIndex: 'parentId',
            hideInSearch: true,
            render: (_text, record) => {
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
            render: (_text, record) => (
                <Space>
                    <NButton key="edit" onClick={() => {
                        setSelectedRowKey(record.id);
                        setOpen(true);
                    }}>
                        {t('actions.edit')}
                    </NButton>
                    <NButton key="manage-users" onClick={() => {
                        setSelectedDepartment(record);
                        setUserModalOpen(true);
                    }}>
                        {t('identity.department.manage_users')}
                    </NButton>
                    <NButton key="delete"
                             onClick={() => {
                                 deleteMutation.mutate(record.id);
                             }}
                             danger={true}
                    >
                        {t('actions.delete')}
                    </NButton>
                    <Dropdown
                        key="more"
                        menu={{
                            items: [
                                {
                                    key: 'view-authorised-asset',
                                    label: `${t('menus.resource.submenus.asset')}${t('actions.authorized')}`
                                },
                                {
                                    key: 'view-authorised-website',
                                    label: `${t('menus.resource.submenus.website')}${t('actions.authorized')}`
                                },
                            ],
                            onClick: ({key}) => {
                                switch (key) {
                                    case 'view-authorised-asset':
                                        navigate(`/authorised-asset?departmentId=${record.id}`);
                                        break;
                                    case 'view-authorised-website':
                                        navigate(`/authorised-website?departmentId=${record.id}`);
                                        break;
                                }
                            }
                        }}
                    >
                        <Button type="link" size="small" style={{padding: 0}}>
                            {t('actions.more')}
                        </Button>
                    </Dropdown>
                </Space>
            ),
        },
    ];

    return (<div>
        <div className="mb-4">
            <Space.Compact>
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
            </Space.Compact>
        </div>

        {viewMode === 'table' ? (
            <NTable
                columns={columns}
                actionRef={actionRef}
                onDragSortEnd={(_beforeIndex, afterIndex, items) => {
                    if (sortMutation.isPending) return;
                    sortMutation.mutate({
                        id: items[afterIndex].id,
                        beforeId: items[afterIndex - 1]?.id,
                        afterId: items[afterIndex + 1]?.id,
                    });
                }}
                request={async (params = {}, sort, _filter) => {
                    let [sortOrder, sortField] = getSort(sort);

                    let queryParams = {
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        sortOrder: sortOrder || "desc",
                        sortField: sortField || "sort",
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
            <div>
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
                        draggable={!sortMutation.isPending}
                        allowDrop={({dragNode, dropNode}) =>
                            !sortMutation.isPending && canDrop(String(dragNode.key), String(dropNode.key))
                        }
                        onDrop={handleTreeDrop}
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
