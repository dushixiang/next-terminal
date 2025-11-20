import React from 'react';
import {Tabs, TabsProps} from "antd";
import {useSearchParams} from "react-router-dom";
import ToolsPing from './ToolsPing';
import ToolsTcping from "@/pages/sysops/ToolsTcping";

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