import React, {useState} from 'react';
import {Tabs} from "antd";
import {useParams, useSearchParams} from "react-router-dom";
import LoginPolicyInfo from "./LoginPolicyInfo";
import LoginPolicyUser from "./LoginPolicyUser";
import {useTranslation} from "react-i18next";

const LoginPolicyDetailPage = () => {
    let {t} = useTranslation();
    let params = useParams();
    const loginPolicyId = params['loginPolicyId'];
    const [searchParams, setSearchParams] = useSearchParams();
    let key = searchParams.get('activeKey');
    key = key ? key : 'detail';

    let [activeKey, setActiveKey] = useState(key);

    const handleTagChange = (key: string) => {
        setActiveKey(key);
        setSearchParams({'activeKey': key});
    }

    const items = [
        {
            label: t('actions.detail'),
            key: 'detail',
            children: <LoginPolicyInfo active={activeKey === 'detail'} id={loginPolicyId}/>
        },
        {
            label: t('actions.binding'),
            key: 'bind-user',
            children: <LoginPolicyUser active={activeKey === 'bind-user'} id={loginPolicyId}/>
        },
    ];

    return (
        <div className="px-4">
            <Tabs activeKey={activeKey} onChange={handleTagChange} items={items}>

            </Tabs>
        </div>
    );
};

export default LoginPolicyDetailPage;