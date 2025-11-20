import React, {useEffect} from 'react';
import {useQuery} from "@tanstack/react-query";
import scheduledTaskApi from '@/api/scheduled-task-api';

interface Props {
    open: boolean
    spec: string;
}

const ScheduledTaskRuntime = ({open, spec}: Props) => {

    let query = useQuery({
        queryKey: ['scheduled-task-runtime', spec],
        queryFn: () => {
            return scheduledTaskApi.getNextTenRuns(spec);
        },
        enabled: open,
        retry: false,
    });

    useEffect(() => {
        if (open) {
            query.refetch();
        }
    }, [open]);

    return (
        <div className={''}>
            {query.isError && <div className={'text-red-500'}>Error: {query.error?.message}</div>}
            <div className={'space-y-1'}>
                {query.data?.map((item: any) => {
                    return <div key={item.id}>{item}</div>
                })}
            </div>
        </div>
    );
};

export default ScheduledTaskRuntime;