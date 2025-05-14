import React, {useEffect, useState} from 'react';
import assetApi from "@/src/api/asset-api";
import {useTranslation} from "react-i18next";
import {Drawer, Tree, TreeDataNode} from "antd";
import {useQuery} from "@tanstack/react-query";

interface Props {
    assetIds: string[];
    open: boolean;
    onClose: () => void;
}

const AssetTreeChoose = ({assetIds, open, onClose}: Props) => {
    let {t} = useTranslation();

    const [treeData, setTreeData] = useState([]);
    let [expandedKeys, setExpandedKeys] = useState([]);
    let [selectedKey, setSelectedKey] = useState('');

    let query = useQuery({
        queryKey: ['assets/groups'],
        queryFn: assetApi.getGroups,
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
        assetApi.changeGroup({
            assetIds: assetIds,
            groupId: groupId,
        })
            .then(() => {
                onClose();
            })
    }

    return (
        <div>
            <Drawer title={t('assets.change_group')}
                    onClose={onClose}
                    open={open}>
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
        </div>
    );
};

export default AssetTreeChoose;