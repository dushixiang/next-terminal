import React, {useState} from 'react';
import {Tabs} from "antd";
import {useParams, useSearchParams} from "react-router-dom";
import LoginPolicyInfo from "./LoginPolicyInfo";
import LoginPolicyUser from "./LoginPolicyUser";

const {TabPane} = Tabs;

const LoginPolicyDetail = () => {
    let params = useParams();
    const loginPolicyId = params['loginPolicyId'];
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
                <TabPane tab="基本信息" key="info">
                    <LoginPolicyInfo active={activeKey === 'info'} id={loginPolicyId}/>
                </TabPane>
                <TabPane tab="绑定用户" key="bind-user">
                    <LoginPolicyUser active={activeKey === 'bind-user'} loginPolicyId={loginPolicyId}/>
                </TabPane>
                <TabPane tab="绑定用户组" key="bind-user-group">
                    暂未实现
                </TabPane>
            </Tabs>
        </div>
    );
};

export default LoginPolicyDetail;