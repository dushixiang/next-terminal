import React, {useState} from 'react';
import {Tabs} from "antd";
import UserInfo from "./UserInfo";
import UserLoginPolicy from "./UserLoginPolicy";
import UserAsset from "./UserAsset";
import {useParams, useSearchParams} from "react-router-dom";
import {hasMenu} from "../../../service/permission";
import AssetUser from "../../asset/AssetUser";

const UserDetail = () => {

    let params = useParams();
    const id = params['userId'];
    const [searchParams, setSearchParams] = useSearchParams();
    let key = searchParams.get('activeKey');
    key = key ? key : 'info';

    let [activeKey, setActiveKey] = useState(key);

    const handleTagChange = (key) => {
        setActiveKey(key);
        setSearchParams({'activeKey': key});
    }

    return (
        <div className="page-detail-warp">
            <Tabs activeKey={activeKey} onChange={handleTagChange}>
                {
                    hasMenu('user-detail') &&
                    <Tabs.TabPane tab="基本信息" key="info">
                        <UserInfo active={activeKey === 'info'} userId={id}/>
                    </Tabs.TabPane>
                }
                {
                    hasMenu('user-authorised-asset') &&
                    <Tabs.TabPane tab="授权的资产" key="asset">
                        <UserAsset active={activeKey === 'asset'} id={id} type={'userId'}/>
                    </Tabs.TabPane>
                }
                {
                    hasMenu('user-login-policy') &&
                    <Tabs.TabPane tab="登录策略" key="login-policy">
                        <UserLoginPolicy active={activeKey === 'login-policy'} userId={id}/>
                    </Tabs.TabPane>
                }
            </Tabs>
        </div>
    );
}

export default UserDetail;