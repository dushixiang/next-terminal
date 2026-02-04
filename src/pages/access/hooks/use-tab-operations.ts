import {useCallback, useState} from 'react';
import type {DragEndEvent} from '@dnd-kit/core';
import {arrayMove} from '@dnd-kit/sortable';

interface TabItem {
    key: string;
    label: string;
    children: React.ReactNode;
}

/**
 * 标签页操作管理 Hook
 * 管理标签页的添加、移除、拖拽排序和右键菜单操作
 */
export function useTabOperations(activeKey: string, setActiveKey: (key: string) => void) {
    const [items, setItems] = useState<TabItem[]>([]);

    // 添加标签页
    const addTab = useCallback((key: string, label: string, children: React.ReactNode) => {
        setItems(prev => {
            const exists = prev.some(item => item.key === key);
            if (exists) {
                return prev;
            }
            return [...prev, {label, children, key}];
        });
        setActiveKey(key);
    }, [setActiveKey]);

    // 移除标签页
    const removeTab = useCallback((targetKey: string) => {
        setItems(prev => {
            let newActiveKey = activeKey;
            let lastIndex = -1;
            prev.forEach((item, i) => {
                if (item.key === targetKey) {
                    lastIndex = i - 1;
                }
            });
            const newPanes = prev.filter((item) => item.key !== targetKey);
            if (newPanes.length && newActiveKey === targetKey) {
                if (lastIndex >= 0) {
                    newActiveKey = newPanes[lastIndex].key;
                } else {
                    newActiveKey = newPanes[0].key;
                }
            }
            setActiveKey(newActiveKey);
            return newPanes;
        });
    }, [activeKey, setActiveKey]);

    // 关闭左侧标签页
    const handleCloseLeft = useCallback((targetKey: string) => {
        setItems(prev => {
            const targetIndex = prev.findIndex(item => item.key === targetKey);
            if (targetIndex <= 0) return prev;

            const leftTabs = prev.slice(0, targetIndex);
            const remainingTabs = prev.slice(targetIndex);

            if (leftTabs.some(tab => tab.key === activeKey)) {
                setActiveKey(targetKey);
            }

            return remainingTabs;
        });
    }, [activeKey, setActiveKey]);

    // 关闭右侧标签页
    const handleCloseRight = useCallback((targetKey: string) => {
        setItems(prev => {
            const targetIndex = prev.findIndex(item => item.key === targetKey);
            if (targetIndex < 0 || targetIndex >= prev.length - 1) return prev;

            const leftTabs = prev.slice(0, targetIndex + 1);

            if (!leftTabs.some(tab => tab.key === activeKey)) {
                setActiveKey(targetKey);
            }

            return leftTabs;
        });
    }, [activeKey, setActiveKey]);

    // 关闭所有标签页
    const handleCloseAll = useCallback(() => {
        setItems([]);
        setActiveKey('');
    }, [setActiveKey]);

    // 关闭其他标签页
    const handleCloseOthers = useCallback((targetKey: string) => {
        setItems(prev => {
            const targetTab = prev.find(item => item.key === targetKey);
            if (!targetTab) return prev;

            setActiveKey(targetKey);
            return [targetTab];
        });
    }, [setActiveKey]);

    // 重连标签页
    const handleReconnect = useCallback((targetKey: string) => {
        setItems(prev => {
            const targetTab = prev.find(item => item.key === targetKey);
            if (!targetTab) return prev;

            // 通过更新 key 来强制重新渲染
            const newKey = targetKey + '_refresh_' + Date.now();
            const newTab = {...targetTab, key: newKey};

            setActiveKey(newKey);
            return prev.map(item =>
                item.key === targetKey ? newTab : item
            );
        });
    }, [setActiveKey]);

    // 拖拽结束处理
    const onDragEnd = useCallback(({active, over}: DragEndEvent) => {
        if (active.id !== over?.id) {
            setItems((prev) => {
                const activeIndex = prev.findIndex((i) => i.key === active.id);
                const overIndex = prev.findIndex((i) => i.key === over?.id);
                return arrayMove(prev, activeIndex, overIndex);
            });
        }
    }, []);

    return {
        items,
        addTab,
        removeTab,
        handleCloseLeft,
        handleCloseRight,
        handleCloseAll,
        handleCloseOthers,
        handleReconnect,
        onDragEnd,
    };
}
