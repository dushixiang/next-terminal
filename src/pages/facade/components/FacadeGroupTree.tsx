import React from 'react';
import { Tree } from 'antd';
import { useTranslation } from 'react-i18next';
import { TreeDataNodeWithExtra } from '@/api/portal-api';

interface FacadeGroupTreeProps {
    title: string;
    treeData: TreeDataNodeWithExtra[] | undefined;
    selectedKey: string;
    onSelect: (key: string) => void;
    expandedKeys: React.Key[];
    onExpand: (keys: React.Key[]) => void;
    loading?: boolean;
}

/**
 * Facade 分组树组件
 * 封装 Ant Design Tree 组件
 */
const FacadeGroupTree: React.FC<FacadeGroupTreeProps> = React.memo(({
    title,
    treeData,
    selectedKey,
    onSelect,
    expandedKeys,
    onExpand,
    loading = false
}) => {
    const { t } = useTranslation();

    const handleSelect = (keys: React.Key[]) => {
        if (keys.length > 0) {
            onSelect(keys[0] as string);
        } else {
            onSelect('');
        }
    };

    return (
        <div className="hidden lg:block rounded-2xl border-2 border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-br from-white via-white to-slate-50/30 dark:from-slate-900/95 dark:via-slate-900/90 dark:to-slate-800/80 backdrop-blur-sm p-5 shadow-xl shadow-slate-200/50 dark:shadow-black/40">
            <div className="mb-3 pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
                <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300">
                    {title}
                </h3>
            </div>
            {loading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    {t('general.loading')}
                </div>
            ) : (
                <Tree
                    treeData={treeData}
                    expandedKeys={expandedKeys}
                    onExpand={onExpand}
                    selectedKeys={selectedKey ? [selectedKey] : []}
                    onSelect={handleSelect}
                    blockNode
                    className="text-sm text-slate-700 dark:text-slate-200 [&_.ant-tree-node-selected]:bg-gradient-to-r [&_.ant-tree-node-selected]:from-blue-50 [&_.ant-tree-node-selected]:to-indigo-50 dark:[&_.ant-tree-node-selected]:from-blue-900/30 dark:[&_.ant-tree-node-selected]:to-indigo-900/30 [&_.ant-tree-node-selected]:border-l-2 [&_.ant-tree-node-selected]:border-blue-500"
                />
            )}
        </div>
    );
});

FacadeGroupTree.displayName = 'FacadeGroupTree';

export default FacadeGroupTree;
