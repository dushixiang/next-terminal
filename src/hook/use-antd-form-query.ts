import {useEffect, useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import type {FormInstance} from 'antd';
import type {MutableRefObject} from 'react';

type QueryKeyPart = string | number | boolean | null | undefined | Record<string, unknown> | QueryKeyPart[];

export const useFormRequest = <T extends Record<string, any>>(
    form: FormInstance | MutableRefObject<FormInstance | null>,
    queryKey: QueryKeyPart[],
    request?: () => Promise<T>,
    enabled = true,
) => {
    const query = useQuery({
        queryKey,
        queryFn: async () => request ? request() : ({} as T),
        enabled: !!request && enabled,
    });

    useEffect(() => {
        const formInstance = 'current' in form ? form.current : form;
        if (query.data) {
            formInstance?.setFieldsValue(query.data);
        }
    }, [form, query.data]);

    return query;
};

export const useSelectRequest = <T = any>(
    queryKey: QueryKeyPart[],
    request?: (params?: Record<string, any>) => Promise<T[]>,
    params?: Record<string, any>,
) => {
    const paramsKey = useMemo(() => params ?? {}, [JSON.stringify(params ?? {})]);

    return useQuery({
        queryKey: [...queryKey, paramsKey],
        queryFn: async () => request ? request(params) : [],
        enabled: !!request,
    });
};
