import React, {useEffect, useState} from 'react';
import {useQuery} from "@tanstack/react-query";
import portalApi from "@/api/portal-api";
import {Input, Modal, Tree, TreeDataNode, TreeProps} from "antd";
import clsx from "clsx";
import {getImgColor} from "@/helper/asset-helper";
import {useTranslation} from "react-i18next";

interface Props {
    open: boolean;
    handleOk: (values: string[]) => void
    handleCancel: () => void
}

const AccessSshChooser = ({handleOk, handleCancel, open}: Props) => {

    let {t} = useTranslation();
    let [keyword, setKeyword] = useState('');
    let treeQuery = useQuery({
        queryKey: ['ssh', 'chooser'],
        queryFn: () => {
            return portalApi.getAssetsTree('ssh', keyword)
        },
        enabled: open === true,
    });

    useEffect(() => {
        if (open === false) {
            return;
        }
        treeQuery.refetch();
    }, [open, keyword]);

    const [treeData, setTreeData] = useState([]);
    let [expandedKeys, setExpandedKeys] = useState([]);
    const [sshAssetKeys, setSshAssetKeys] = useState<string[]>([]);

    useEffect(() => {
        setSshAssetKeys([]);
    }, [open]);

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

    useEffect(() => {
        if (treeQuery.data) {
            setTreeData(treeQuery.data);
            let keys1 = getAllKeys(treeQuery.data);
            setExpandedKeys(keys1);
        }
    }, [treeQuery.data]);

    const onCheck: TreeProps['onCheck'] = (checkedKeysValue, {checkedNodes}) => {
        // console.log('onCheck', checkedKeysValue, checkedNodes);
        let keys = checkedNodes.filter(item => item.isLeaf).map((item) => item.key);
        setSshAssetKeys(keys as string[]);
    };

    return (
        <div>
            <Modal
                title={t('access.batch.choose_asset')}
                open={open}
                maskClosable={false}
                destroyOnHidden={true}
                onOk={() => {
                    handleOk(sshAssetKeys);
                }}
                onCancel={() => {
                    // 
                    handleCancel();
                }}
            >
                <div className={'space-y-4'}>
                    <Input.Search placeholder="Search" onChange={(e) => {
                        setKeyword(e.target.value);
                    }}/>

                    <Tree
                        titleRender={(node) => {
                            return <span className={'flex items-center gap-1'}>
                                    {node.extra?.logo ?
                                        <img className={'h-4 w-4'} src={node.extra?.logo} alt={'logo'}/>
                                        :
                                        <div
                                            className={clsx(`w-4 h-4 rounded flex items-center justify-center font-bold text-white text-xs`, getImgColor(node.extra?.protocol))}>
                                        </div>
                                    }
                                <span>
                                        {node.title}
                                    </span>
                                </span>
                        }}
                        treeData={treeData}
                        onExpand={setExpandedKeys}
                        expandedKeys={expandedKeys}
                        checkable={true}
                        onCheck={onCheck}
                        // autoExpandParent={true}
                        onSelect={(keys, info) => {
                            console.log('onSelect', keys, info)
                        }}
                    />
                </div>
            </Modal>
        </div>
    );
};

export default AccessSshChooser;