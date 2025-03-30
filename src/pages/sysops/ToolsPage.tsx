import React from 'react';
import {Tabs, TabsProps} from "antd";
import {useSearchParams} from "react-router-dom";
import ToolsPing from './ToolsPing';
import ToolsTcping from "@/src/pages/sysops/ToolsTcping";
import ToolsTraceRoute from "@/src/pages/sysops/ToolsTraceRoute";

const ToolsPage = () => {

    let [searchParams, setSearchParams] = useSearchParams();

    const items: TabsProps['items'] = [
        {
            key: 'ping',
            label: 'Ping',
            children: <ToolsPing/>,
        },
        {
            key: 'tcping',
            label: 'TCP Ping',
            children: <ToolsTcping/>,
        },
        {
            key: 'traceroute',
            label: 'Trace Route',
            children: <ToolsTraceRoute/>,
        },
    ];

    const onChange = (key: string) => {
        searchParams.set('tab', key);
        setSearchParams(searchParams);
    }

    return (
        <div className='px-4'>
            <Tabs activeKey={searchParams.get('tab') || 'ping'}
                  items={items}
                  onChange={onChange}
            />
        </div>
    );
};

export default ToolsPage;