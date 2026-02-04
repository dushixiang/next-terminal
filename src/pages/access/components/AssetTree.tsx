import React, {Key} from 'react';
import {Tooltip, Tree, Typography} from 'antd';
import {TreeDataNodeWithExtra} from '@/api/portal-api';
import {cn} from '@/lib/utils';
import clsx from 'clsx';
import {getImgColor} from '@/helper/asset-helper';

interface AssetTreeProps {
    treeData: TreeDataNodeWithExtra[];
    expandedKeys: Key[];
    onExpand: (keys: Key[]) => void;
    onNodeDoubleClick: (node: TreeDataNodeWithExtra) => void;
}

/**
 * AssetTree 组件
 * 渲染资产树，支持双击打开和复制 IP
 */
const AssetTree = React.memo(({
                                  treeData,
                                  expandedKeys,
                                  onExpand,
                                  onNodeDoubleClick,
                              }: AssetTreeProps) => {
    // 渲染节点图标
    const renderLogo = (node: TreeDataNodeWithExtra) => {
        if (!node.isLeaf) {
            return undefined;
        }
        if (node.extra?.logo) {
            return <img className={'h-4 w-4'} src={node.extra?.logo} alt={'logo'}/>;
        }
        return (
            <div
                className={clsx(
                    `w-4 h-4 rounded flex items-center justify-center text-white`,
                    getImgColor(node.extra?.protocol)
                )}
                style={{
                    fontSize: 9,
                }}
            >
                {node.title[0]}
            </div>
        );
    };

    return (
        <Tree
            titleRender={(node) => {
                const strTitle = node.title as string;

                if (!node.isLeaf) {
                    return strTitle;
                }

                return (
                    <Tooltip title={
                        <Typography.Paragraph copyable style={{margin: 0}}>
                            {node.extra?.network}
                        </Typography.Paragraph>
                    }>
                        <div
                            className={cn('flex items-center gap-1',
                                node.extra?.status === 'inactive' && 'filter grayscale'
                            )}
                            onDoubleClick={() => onNodeDoubleClick(node)}
                        >
                            {renderLogo(node)}
                            <div className={cn(node.extra?.status === 'inactive' && 'text-gray-500')}>
                                <span>{strTitle}</span>
                            </div>
                        </div>
                    </Tooltip>
                );
            }}
            treeData={treeData}
            onExpand={onExpand}
            expandedKeys={expandedKeys}
        />
    );
});

AssetTree.displayName = 'AssetTree';

export default AssetTree;
