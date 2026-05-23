import React from 'react';
import type {SelectProps} from 'antd';
import {Select} from 'antd';
import {useSelectRequest} from '@/hook/use-antd-form-query';

type QuerySelectProps = SelectProps & {
    request?: (params?: Record<string, any>) => Promise<any[]>;
    params?: Record<string, any>;
    queryKey?: unknown[];
};

const QuerySelect = ({request, params, queryKey, options, loading, ...props}: QuerySelectProps) => {
    const query = useSelectRequest(
        ['query-select', ...(queryKey ?? []), request?.toString()],
        request,
        params,
    );

    return (
        <Select
            {...props}
            loading={loading ?? query.isFetching}
            options={options ?? query.data ?? []}
        />
    );
};

export default QuerySelect;
