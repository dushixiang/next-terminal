import {useTranslation} from 'react-i18next';
import {Tabs, TabsProps, Typography} from "antd";
import {useSearchParams} from "react-router-dom";
import ToolsPing from './ToolsPing';
import ToolsTcping from "@/pages/sysops/ToolsTcping";

const ToolsPage = () => {
    const {t} = useTranslation();

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
        <div className="flex h-full min-h-0 flex-col">
            <Typography.Paragraph type="secondary">{t('sysops.tools.source_tip')}</Typography.Paragraph>
            <Tabs activeKey={searchParams.get('tab') || 'ping'}
                  items={items}
                  onChange={onChange}
                  styles={{
                      root: {flex: 1, minHeight: 0, overflow: 'hidden'},
                      body: {height: '100%', minHeight: 0},
                      content: {height: '100%', minHeight: 0, overflow: 'hidden'},
                  }}
            />
        </div>
    );
};

export default ToolsPage;
