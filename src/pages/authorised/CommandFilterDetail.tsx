import React, {useState} from 'react';
import {Tabs} from "antd";
import {useParams, useSearchParams} from "react-router-dom";
import CommandFilterInfo from "./CommandFilterInfo";
import CommandFilterRulePage from "./CommandFilterRulePage";
import {maybe} from "@/utils/maybe";
import {useTranslation} from "react-i18next";

const CommandFilterDetail = () => {
    let params = useParams();
    const id = params['commandFilterId'] as string;
    const [searchParams, setSearchParams] = useSearchParams();
    let key = maybe(searchParams.get('activeKey'), 'info');
    let {t} = useTranslation();

    let [activeKey, setActiveKey] = useState(key);

    const handleTagChange = (key: string) => {
        setActiveKey(key);
        setSearchParams({'activeKey': key});
    }

    const items = [
        {
            label: t('actions.detail'),
            key: 'info',
            children: <CommandFilterInfo id={id}/>
        },
        {
            label: t('authorised.command_filter.options.rule'),
            key: 'rules',
            children: <CommandFilterRulePage id={id}/>
        },
    ];

    return (
        <div className={'px-4'}>
            <Tabs activeKey={activeKey} onChange={handleTagChange} items={items}>

            </Tabs>
        </div>
    );
};

export default CommandFilterDetail;