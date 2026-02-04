import { TreeDataNodeWithExtra } from "@/api/portal-api";
import React from "react";

/**
 * 获取树的所有展开键
 * @param data 树数据
 * @returns 所有非叶子节点的 key 数组
 */
export const getAllKeys = (data: TreeDataNodeWithExtra[]): React.Key[] => {
    let keys: React.Key[] = [];
    data.forEach((item) => {
        if (!item.isLeaf) {
            keys.push(item.key);
        }
        if (item.children) {
            keys = keys.concat(getAllKeys(item.children));
        }
    });
    return keys;
};

/**
 * 查找树节点
 * @param data 树数据
 * @param key 节点 key
 * @returns 找到的节点或 null
 */
export const findNode = (data: TreeDataNodeWithExtra[], key: string): TreeDataNodeWithExtra | null => {
    for (const item of data) {
        if (item.key === key) {
            return item;
        }
        if (item.children) {
            const found = findNode(item.children, key);
            if (found) {
                return found;
            }
        }
    }
    return null;
};

/**
 * 获取分组及其所有子分组的 ID
 * @param data 树数据
 * @param groupKey 分组 key
 * @returns 分组及所有子分组的 ID 数组
 */
export const getGroupAndChildIds = (data: TreeDataNodeWithExtra[], groupKey: string): string[] => {
    const ids: string[] = [groupKey];

    const collectChildIds = (nodes: TreeDataNodeWithExtra[], parentKey: string) => {
        for (const node of nodes) {
            if (node.key === parentKey) {
                if (node.children) {
                    node.children.forEach(child => {
                        if (!child.isLeaf) {
                            ids.push(child.key);
                            collectChildIds(node.children!, child.key);
                        }
                    });
                }
                return;
            }
            if (node.children) {
                collectChildIds(node.children, parentKey);
            }
        }
    };

    collectChildIds(data, groupKey);
    return ids;
};

/**
 * 检查项目是否在指定的分组列表中
 * @param itemGroupId 项目的分组 ID
 * @param groupIds 分组 ID 列表
 * @returns 是否在分组中
 */
export const checkItemInGroups = (itemGroupId: string, groupIds: string[]): boolean => {
    return groupIds.includes(itemGroupId) || itemGroupId === '';
};
