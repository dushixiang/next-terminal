import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Form, TreeSelect} from 'antd';
import type {FormItemProps} from 'antd';

type RequestParams = Record<string, any>;

interface ProFormTreeSelectProps extends Omit<FormItemProps, 'children'> {
    allowClear?: boolean;
    disabled?: boolean;
    fieldProps?: Record<string, any>;
    params?: RequestParams;
    placeholder?: string;
    request?: (params?: RequestParams) => Promise<any[]>;
}

const ProFormTreeSelect = ({
    allowClear,
    disabled,
    fieldProps,
    params,
    placeholder,
    request,
    ...formItemProps
}: ProFormTreeSelectProps) => {
    const [loading, setLoading] = useState(false);
    const [treeData, setTreeData] = useState<any[]>([]);
    const requestRef = useRef(request);
    const paramsKey = useMemo(() => JSON.stringify(params ?? {}), [params]);

    requestRef.current = request;

    useEffect(() => {
        if (!requestRef.current) {
            return;
        }

        let canceled = false;
        const loadOptions = async () => {
            setLoading(true);
            try {
                const data = await requestRef.current?.(params);
                if (!canceled) {
                    setTreeData(data || []);
                }
            } finally {
                if (!canceled) {
                    setLoading(false);
                }
            }
        };

        loadOptions();

        return () => {
            canceled = true;
        };
    }, [paramsKey]);

    return (
        <Form.Item {...formItemProps}>
            <TreeSelect
                allowClear={allowClear ?? fieldProps?.allowClear}
                disabled={disabled}
                loading={loading}
                placeholder={placeholder}
                variant={fieldProps?.variant}
                {...fieldProps}
                treeData={fieldProps?.treeData ?? treeData}
            />
        </Form.Item>
    );
};

export default ProFormTreeSelect;
