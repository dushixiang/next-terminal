import React, {useState} from 'react';
import {useParams, useSearchParams} from "react-router-dom";
import {Tabs} from "antd";
import GroupInfo from "./GroupInfo";
import {maybe} from "../../utils/maybe";
import UserAuthorised from "@/src/pages/authorised/UserAuthorised";
import {useTranslation} from "react-i18next";

const GroupDetail = () => {
    let params = useParams();
    const id = params['userGroupId'] as string;
    const [searchParams, setSearchParams] = useSearchParams();
    let key = maybe(searchParams.get('activeKey'), 'detail');

    let [activeKey, setActiveKey] = useState(key);

    let {t} = useTranslation();

    const handleTagChange = (key: string) => {
        setActiveKey(key);
        setSearchParams({'activeKey': key});
    }

    const items = [
        {
            label: t('actions.detail'),
            key: 'detail',
            children: <GroupInfo active={activeKey === 'detail'} id={id}/>
        },
        {
            label: t('identity.options.authorized_asset'),
            key: 'asset',
            children: <UserAuthorised active={activeKey === 'asset'} userId={''} userGroupId={id}/>
        }
    ];

    return (
        <div className={'px-4'}>
            <Tabs activeKey={activeKey} onChange={handleTagChange} items={items}>

            </Tabs>
        </div>
    );
};

export default GroupDetail;