import React, {useState} from 'react';
import {useParams, useSearchParams} from "react-router-dom";
import {Tabs} from "antd";
import UserGroupInfo from "./UserGroupInfo";
import UserAsset from "./user/UserAsset";
import {hasMenu} from "../../service/permission";
import UserInfo from "./user/UserInfo";

const UserGroupDetail = () => {
    let params = useParams();
    const id = params['userGroupId'];
    const [searchParams, setSearchParams] = useSearchParams();
    let key = searchParams.get('activeKey');
    key = key ? key : 'info';

    let [activeKey, setActiveKey] = useState(key);

    const handleTagChange = (key) => {
        setActiveKey(key);
        setSearchParams({'activeKey': key});
    }

    return (
        <div>
            <div className="page-detail-warp">
                <Tabs activeKey={activeKey} onChange={handleTagChange}>
                    {
                        hasMenu('user-group-detail') &&
                        <Tabs.TabPane tab="基本信息" key="info">
                            <UserGroupInfo active={activeKey === 'info'} id={id}/>
                        </Tabs.TabPane>
                    }
                    {
                        hasMenu('user-group-detail') &&
                        <Tabs.TabPane tab="授权的资产" key="asset">
                            <UserAsset active={activeKey === 'asset'} id={id} type={'userGroupId'}/>
                        </Tabs.TabPane>
                    }
                </Tabs>
            </div>
        </div>
    );
};

export default UserGroupDetail;