import React, {useContext} from 'react';
import {Table, type TableProps} from 'antd';
import {closestCenter, DndContext, PointerSensor, useSensor, useSensors} from '@dnd-kit/core';
import type {DragEndEvent} from '@dnd-kit/core';
import {arrayMove, SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';

interface DragHandleContextValue {
    setActivatorNodeRef?: (element: HTMLElement | null) => void;
    listeners?: Record<string, any>;
    attributes?: Record<string, any>;
}

const DragHandleContext = React.createContext<DragHandleContextValue>({});

interface DragHandleProps {
    title?: string;
}

const Grab = <svg viewBox="64 64 896 896" focusable="false" data-icon="holder" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M300 276.5a56 56 0 1056-97 56 56 0 00-56 97zm0 284a56 56 0 1056-97 56 56 0 00-56 97zM640 228a56 56 0 10112 0 56 56 0 00-112 0zm0 284a56 56 0 10112 0 56 56 0 00-112 0zM300 844.5a56 56 0 1056-97 56 56 0 00-56 97zM640 796a56 56 0 10112 0 56 56 0 00-112 0z"></path></svg>

export const DragHandle = ({title = 'Drag'}: DragHandleProps) => {
    const {setActivatorNodeRef, listeners, attributes} = useContext(DragHandleContext);

    return (
        <button
            ref={setActivatorNodeRef}
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent p-0 text-gray-400 outline-none transition-colors hover:bg-gray-100 hover:text-gray-700 active:cursor-grabbing dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label={title}
            title={title}
            {...attributes}
            {...listeners}
        >
            <span className="inline-flex h-4 w-4 cursor-grab items-center justify-center text-[15px] leading-none active:cursor-grabbing">
                {Grab}
            </span>
        </button>
    );
};

interface DraggableBodyRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
    'data-row-key'?: string;
}

const DraggableBodyRow = ({children, ...props}: DraggableBodyRowProps) => {
    const rowKey = props['data-row-key'];
    const {
        attributes,
        listeners,
        setActivatorNodeRef,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: rowKey || '',
        disabled: !rowKey,
    });

    const style: React.CSSProperties = {
        ...props.style,
        transform: CSS.Translate.toString(transform),
        transition,
        ...(isDragging ? {position: 'relative', zIndex: 1} : {}),
    };

    return (
        <DragHandleContext.Provider value={{
            setActivatorNodeRef,
            listeners,
            attributes,
        }}>
            <tr
                {...props}
                ref={setNodeRef}
                style={style}
            >
                {children}
            </tr>
        </DragHandleContext.Provider>
    );
};

type RowKey<T> = TableProps<T>['rowKey'];

const getRowKey = <T extends object>(record: T, rowKey: RowKey<T>): React.Key => {
    if (typeof rowKey === 'function') {
        return rowKey(record);
    }
    if (typeof rowKey === 'string') {
        return (record as Record<string, React.Key>)[rowKey];
    }
    return (record as Record<string, React.Key>).key;
};

interface DraggableTableProps<T extends object> extends TableProps<T> {
    onDragSortEnd?: (beforeIndex: number, afterIndex: number, newDataSource: T[]) => void;
}

const DraggableTable = <T extends object>({
                                             dataSource = [],
                                             rowKey,
                                             onDragSortEnd,
                                             ...props
                                         }: DraggableTableProps<T>) => {
    const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 8}}));
    const resolvedRowKey: RowKey<T> = rowKey || 'key';
    const itemKeys = dataSource.map((item) => String(getRowKey(item, resolvedRowKey)));

    const handleDragEnd = ({active, over}: DragEndEvent) => {
        if (!over || active.id === over.id) {
            return;
        }

        const beforeIndex = itemKeys.indexOf(String(active.id));
        const afterIndex = itemKeys.indexOf(String(over.id));
        if (beforeIndex < 0 || afterIndex < 0) {
            return;
        }

        onDragSortEnd?.(beforeIndex, afterIndex, arrayMove([...dataSource], beforeIndex, afterIndex));
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={itemKeys} strategy={verticalListSortingStrategy}>
                <Table<T>
                    {...props}
                    rowKey={resolvedRowKey}
                    dataSource={dataSource}
                    components={{
                        ...props.components,
                        body: {
                            ...props.components?.body,
                            row: DraggableBodyRow,
                        },
                    }}
                />
            </SortableContext>
        </DndContext>
    );
};

export default DraggableTable;
