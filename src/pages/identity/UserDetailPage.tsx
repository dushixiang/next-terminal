import React, {useState} from 'react';
import {Tabs} from "antd";
import UserInfo from "./UserInfo";
import UserLoginPolicy from "./UserLoginPolicy";
import {useParams, useSearchParams} from "react-router-dom";
import {maybe} from "../../utils/maybe";
import UserAuthorised from "@/src/pages/authorised/UserAuthorised";
import {useTranslation} from "react-i18next";

const UserDetailPage = () => {

    let {t} = useTranslation();
    let params = useParams();
    const id = params['userId'] as string;
    const [searchParams, setSearchParams] = useSearchParams();
    let key = maybe(searchParams.get('activeKey'), 'info');

    let [activeKey, setActiveKey] = useState(key);

    const handleTagChange = (key: string) => {
        setActiveKey(key);
        setSearchParams({'activeKey': key});
    }

    const items = [
        {
            label: t('actions.detail'),
            key: 'info',
            children: <UserInfo active={activeKey === 'info'} id={id}/>
        },
        {
            label: t('identity.options.authorized_asset'),
            key: 'asset',
            children: <UserAuthorised active={activeKey === 'asset'} userId={id} userGroupId={''}/>
        },
        {
            label: t('identity.options.login_policy'),
            key: 'login-policy',
            children: <UserLoginPolicy active={activeKey === 'login-policy'} userId={id}/>
        },
    ];

    return (
        <div className={'px-4'}>
            <Tabs activeKey={activeKey} onChange={handleTagChange} items={items}>
            </Tabs>
        </div>
    );
}

export default UserDetailPage;