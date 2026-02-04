import React, {useCallback} from 'react';
import {Tabs} from 'antd';
import {closestCenter, DndContext, PointerSensor, useSensor} from '@dnd-kit/core';
import {horizontalListSortingStrategy, SortableContext, useSortable} from '@dnd-kit/sortable';
import type {DragEndEvent} from '@dnd-kit/core';
import {CSS} from '@dnd-kit/utilities';
import {ResizablePanel} from '@/components/ui/resizable';
import TabContextMenu from '@/components/TabContextMenu';

interface DraggableTabPaneProps extends React.HTMLAttributes<HTMLDivElement> {
    'data-node-key': string;
}

const DraggableTabNode = ({className, ...props}: DraggableTabPaneProps) => {
    const {attributes, listeners, setNodeRef, transform, transition} = useSortable({
        id: props['data-node-key'],
    });

    const style: React.CSSProperties = {
        ...props.style,
        transform: CSS.Translate.toString(transform),
        transition,
        cursor: 'move',
    };

    return React.cloneElement(props.children as React.ReactElement, {
        // @ts-ignore
        ref: setNodeRef,
        style,
        ...attributes,
        ...listeners,
    });
};

interface TabItem {
    key: string;
    label: string;
    children: React.ReactNode;
}

interface AccessTabContainerProps {
    items: TabItem[];
    activeKey: string;
    leftPanelSize: number;
    onChange: (key: string) => void;
    onRemove: (key: string) => void;
    onDragEnd: (event: DragEndEvent) => void;
    onContentResize: (size: number) => void;
    tabOperations: {
        handleCloseLeft: (key: string) => void;
        handleCloseRight: (key: string) => void;
        handleCloseAll: () => void;
        handleCloseOthers: (key: string) => void;
        handleReconnect: (key: string) => void;
    };
}

/**
 * AccessTabContainer 组件
 * 标签页容器，支持拖拽排序和右键菜单操作
 */
const AccessTabContainer = React.memo(({
                                           items,
                                           activeKey,
                                           leftPanelSize,
                                           onChange,
                                           onRemove,
                                           onDragEnd,
                                           onContentResize,
                                           tabOperations,
                                       }: AccessTabContainerProps) => {
    const sensor = useSensor(PointerSensor, {activationConstraint: {distance: 10}});

    const handleEdit = useCallback((targetKey: string | React.MouseEvent | React.KeyboardEvent, action: 'add' | 'remove') => {
        if (action === 'remove') {
            onRemove(targetKey as string);
        }
    }, [onRemove]);

    return (
        <ResizablePanel
            defaultSize={100 - leftPanelSize}
            className={'bg-[#1E1E1E] access-container'}
            onResize={onContentResize}
        >
            <Tabs
                items={items.map((item) => ({
                    key: item.key,
                    label: (
                        <TabContextMenu
                            tabKey={item.key}
                            currentActiveKey={activeKey}
                            allTabs={items}
                            onCloseLeft={tabOperations.handleCloseLeft}
                            onCloseRight={tabOperations.handleCloseRight}
                            onCloseAll={tabOperations.handleCloseAll}
                            onCloseOthers={tabOperations.handleCloseOthers}
                            onReconnect={tabOperations.handleReconnect}
                        >
                            {item.label}
                        </TabContextMenu>
                    ),
                    children: item.children,
                }))}
                hideAdd
                size={'small'}
                type={'editable-card'}
                renderTabBar={(tabBarProps, DefaultTabBar) => (
                    <DndContext
                        sensors={[sensor]}
                        onDragEnd={onDragEnd}
                        collisionDetection={closestCenter}
                    >
                        <SortableContext
                            items={items.map((i) => i.key)}
                            strategy={horizontalListSortingStrategy}
                        >
                            <DefaultTabBar {...tabBarProps}>
                                {(node) => (
                                    <DraggableTabNode
                                        {...(node as React.ReactElement<DraggableTabPaneProps>).props}
                                        key={node.key}
                                    >
                                        {node}
                                    </DraggableTabNode>
                                )}
                            </DefaultTabBar>
                        </SortableContext>
                    </DndContext>
                )}
                tabBarStyle={{}}
                activeKey={activeKey}
                onChange={onChange}
                onEdit={handleEdit}
            />
        </ResizablePanel>
    );
});

AccessTabContainer.displayName = 'AccessTabContainer';

export default AccessTabContainer;
