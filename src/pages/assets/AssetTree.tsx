import React, {useEffect, useState} from 'react';
import {Dropdown, MenuProps, Tooltip, Tree, TreeDataNode, TreeProps} from "antd";
import AssetTreeModal, {OP} from "@/src/pages/assets/AssetTreeModal";
import {generateRandomId} from "@/src/utils/utils";
import {useQuery} from "@tanstack/react-query";
import assetApi from "@/src/api/asset-api";
import {useTranslation} from "react-i18next";
import {CogIcon, PackagePlusIcon, PlusIcon, TrashIcon} from "lucide-react";

interface Props {
    selected: string
    onSelect: (key: string) => void
}

interface ContextMenu {
    pageX: number,
    pageY: number,
    node: TreeDataNode,
}

const AssetTree = ({selected, onSelect}: Props) => {

    let {t} = useTranslation();
    const [treeData, setTreeData] = useState([]);

    let [open, setOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<React.Key>();
    let [selectedNode, setSelectedNode] = useState<TreeDataNode>();
    let [op, setOP] = useState<OP>();
    let [expandedKeys, setExpandedKeys] = useState([]);

    let [selectedKeys, setSelectedKeys] = useState<React.Key[]>([selected]);

    let query = useQuery({
        queryKey: ['assets/tree'],
        queryFn: assetApi.getGroups,
    });

    useEffect(() => {
        if (query.data) {
            setTreeData(query.data);
            let keys1 = getAllKeys(query.data);
            setExpandedKeys(keys1);
        }
    }, [query.data]);

    const getAllKeys = (data: TreeDataNode[]) => {
        let keys = [];
        data.forEach((item) => {
            keys.push(item.key);
            if (item.children) {
                keys = keys.concat(getAllKeys(item.children));
            }
        });
        return keys;
    };

    const updateTreeData = (data: TreeDataNode[]) => {
        assetApi.setGroups(data).then(() => {
            setTreeData(data);
        })
    }

    const onDrop: TreeProps['onDrop'] = (info) => {
        const dropKey = info.node.key;
        const dragKey = info.dragNode.key;
        if (dragKey === 'default') {
            return;
        }

        const dropPos = info.node.pos.split('-');
        const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]); // the drop position relative to the drop node, inside 0, top -1, bottom 1

        const loop = (
            data: TreeDataNode[],
            key: React.Key,
            callback: (node: TreeDataNode, i: number, data: TreeDataNode[]) => void,
        ) => {
            for (let i = 0; i < data.length; i++) {
                if (data[i].key === key) {
                    return callback(data[i], i, data);
                }
                if (data[i].children) {
                    loop(data[i].children!, key, callback);
                }
            }
        };
        const data = [...treeData];

        // Find dragObject
        let dragObj: TreeDataNode;
        loop(data, dragKey, (item, index, arr) => {
            arr.splice(index, 1);
            dragObj = item;
        });

        if (!info.dropToGap) {
            // Drop on the content
            loop(data, dropKey, (item) => {
                item.children = item.children || [];
                // where to insert. New item was inserted to the start of the array in this example, but can be anywhere
                item.children.unshift(dragObj);
            });
        } else {
            let ar: TreeDataNode[] = [];
            let i: number;
            loop(data, dropKey, (_item, index, arr) => {
                ar = arr;
                i = index;
            });
            if (dropPosition === -1) {
                // Drop on the top of the drop node
                ar.splice(i!, 0, dragObj!);
            } else {
                // Drop on the bottom of the drop node
                ar.splice(i! + 1, 0, dragObj!);
            }
        }
        updateTreeData(data);
    };


    const deleteNode = (key: React.Key, data: TreeDataNode[]) => {
        return data
            .map(item => {
                if (item.key === key) {
                    return null;
                }
                if (item.children) {
                    item.children = deleteNode(key, item.children);
                }
                return item;
            })
            .filter(item => item !== null);
    };

    const updateNode = (key: React.Key, data: TreeDataNode[], newValue: TreeDataNode) => {
        return data.map(item => {
            if (item.key === key) {
                item.title = newValue.title;
                return item;
            }
            if (item.children) {
                item.children = updateNode(key, item.children, newValue);
            }
            return item;
        });
    };

    const addNode = (key: React.Key, data: TreeDataNode[], newNode: TreeDataNode) => {
        if (!key) {
            data.push(newNode);
            return data;
        }
        return data.map(item => {
            if (item.key === key) {
                item.children = item.children ? [...item.children, newNode] : [newNode];
            }
            if (item.children) {
                item.children = addNode(key, item.children, newNode);
            }
            return item;
        });
    };

    const [contextMenu, setContextMenu] = useState<ContextMenu>(null);

    const items: MenuProps['items'] = [
        {
            label: t('actions.add'),
            key: 'add',
            icon: <PlusIcon className={'h-4 w-4'}/>,
            onClick: () => {
                setSelectedRowKey(contextMenu.node.key);
                setSelectedNode(undefined);
                setOpen(true);
                setOP('add');
            },
        },
        {
            label: t('actions.edit'),
            key: 'edit',
            icon: <CogIcon className={'h-4 w-4'}/>,
            onClick: () => {
                setSelectedRowKey(contextMenu.node.key);
                setSelectedNode(contextMenu.node);
                setOpen(true);
                setOP('edit');
            },
        },
        {
            label: t('actions.delete'),
            key: 'delete',
            danger: true,
            icon: <TrashIcon className={'h-4 w-4'}/>,
            onClick: () => {
                assetApi.deleteGroup(contextMenu.node.key as string).then(() => {
                    query.refetch();
                })
            },
        },
    ];

    const handleRightClick = ({event, node}) => {
        if (node.key === 'default') {
            return;
        }
        // console.log(`handleRightClick`, event, node)
        event.preventDefault();
        setContextMenu({
            pageX: event.pageX,
            pageY: event.pageY,
            node,
        });
    };

    return (
        <div className={'rounded-lg border'}>
            <div className={'px-4 pt-4 flex items-center justify-between'}>
                <div className={'font-medium text-[15px] flex items-center gap-2'}>
                    <Tooltip title={t('actions.add')}>
                        <PackagePlusIcon className={'h-4 w-4 cursor-pointer'}
                                         onClick={() => {
                                             setSelectedRowKey(undefined);
                                             setSelectedNode(undefined);
                                             setOpen(true);
                                             setOP('add');
                                         }}
                        />
                    </Tooltip>

                    <Tooltip title={t('assets.group_tip')}>
                        <div className={'cursor-pointer'}>
                            {t('assets.group')}
                        </div>
                    </Tooltip>

                </div>
            </div>

            <Tree
                draggable
                blockNode
                onDrop={onDrop}
                treeData={treeData}
                expandedKeys={expandedKeys}
                onExpand={setExpandedKeys}
                style={{
                    // backgroundColor: '#FFF',
                    padding: 8,
                }}
                selectedKeys={selectedKeys}
                onSelect={(keys) => {
                    setSelectedKeys(keys);
                    if (keys.length > 0) {
                        onSelect(keys[0] as string)
                    } else {
                        onSelect('');
                    }
                }}
                onRightClick={handleRightClick}
                // showLine={true}
            />

            {contextMenu && (
                <Dropdown
                    menu={{
                        items
                    }}
                    open={true}
                    trigger={['contextMenu']}
                    onOpenChange={(visible) => !visible && setContextMenu(null)}
                    overlayStyle={{
                        position: 'absolute',
                        left: contextMenu.pageX,
                        top: contextMenu.pageY,
                    }}
                >
                    <div style={{
                        position: 'fixed',
                        top: contextMenu.pageY,
                        left: contextMenu.pageX,
                        width: 0,
                        height: 0
                    }}/>
                </Dropdown>
            )}

            <AssetTreeModal
                op={op}
                open={open}
                confirmLoading={false}
                node={selectedNode}
                handleCancel={() => {
                    setOpen(false);
                    setSelectedRowKey(undefined);
                }}
                handleOk={(values) => {
                    let newTreeData = [];
                    if (values['key']) {
                        newTreeData = updateNode(values['key'], treeData, values);
                    } else {
                        values['key'] = "AG_" + generateRandomId();
                        values['children'] = []
                        newTreeData = addNode(selectedRowKey, treeData, values);
                    }
                    console.log(`newTreeData`, selectedRowKey, values, newTreeData)
                    updateTreeData([...newTreeData]);
                    setOpen(false);
                    setSelectedRowKey(undefined);
                }}
            />
        </div>
    );
};

export default AssetTree;