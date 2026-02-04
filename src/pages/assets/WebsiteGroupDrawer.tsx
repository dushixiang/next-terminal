import React, {useEffect, useState} from 'react';
import {Drawer, Tree, TreeDataNode} from 'antd';
import {useTranslation} from 'react-i18next';
import websiteApi from '../../api/website-api';
import {useQuery} from "@tanstack/react-query";

interface WebsiteGroupDrawerProps {
    open: boolean;
    onClose: () => void;
    websiteIds: string[];
    onSuccess: () => void;
}

const WebsiteGroupDrawer: React.FC<WebsiteGroupDrawerProps> = ({
                                                                   open,
                                                                   onClose,
                                                                   websiteIds,
                                                                   onSuccess,
                                                               }) => {
    const {t} = useTranslation();
    const [treeData, setTreeData] = useState([]);
    let [expandedKeys, setExpandedKeys] = useState([]);
    let [selectedKey, setSelectedKey] = useState('');

    let query = useQuery({
        queryKey: ['assets/groups'],
        queryFn: websiteApi.getGroups,
    });

    useEffect(() => {
        if (open) {
            query.refetch();
        } else {
            setSelectedKey('');
        }
    }, [open]);

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

    const post = (groupId: string) => {
        websiteApi.changeGroup({
            websiteIds: websiteIds,
            groupId: groupId,
        })
            .then(() => {
                if (onSuccess) {
                    onSuccess();
                }
                onClose();
            })
    }
    const handleCancel = () => {
        onClose();
    };

    return (
        <Drawer
            title={t('assets.group')}
            open={open}
            onClose={handleCancel}
        >
            <Tree
                blockNode
                treeData={treeData}
                expandedKeys={expandedKeys}
                onExpand={setExpandedKeys}
                selectedKeys={[selectedKey]}
                style={{
                    // backgroundColor: '#FFF',
                    padding: 4,
                }}

                onSelect={(keys) => {
                    if (keys && keys.length > 0) {
                        setSelectedKey(keys[0] as string);
                        post(keys[0] as string);
                    }
                }}
            />
        </Drawer>
    );
};

export default WebsiteGroupDrawer;