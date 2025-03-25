import React, {useState} from 'react';
import {useParams, useSearchParams} from "react-router-dom";
import {Tabs} from "antd";
import {maybe} from "@/src/utils/maybe";
import WebsiteAuthorised from "@/src/pages/assets/WebsiteAuthorised";

const {TabPane} = Tabs;

const WebsiteDetail = () => {
    let params = useParams();
    const id = params['websiteId'] as string;
    const [searchParams, setSearchParams] = useSearchParams();
    let key = maybe(searchParams.get('activeKey'), "bind-user");

    let [activeKey, setActiveKey] = useState(key);

    const handleTagChange = (key: string) => {
        setActiveKey(key);
        setSearchParams({'activeKey': key});
    }

    return (
        <div className={'px-4'}>
            <Tabs activeKey={activeKey} onChange={handleTagChange}>
                <TabPane tab="授权的用户" key="bind-user">
                    <WebsiteAuthorised active={activeKey === 'bind-user'} websiteId={id} view={'User'}/>
                </TabPane>
                <TabPane tab="授权的用户组" key="bind-user-group">
                    <WebsiteAuthorised active={activeKey === 'bind-user-group'} websiteId={id} view={'UserGroup'}/>
                </TabPane>
            </Tabs>
        </div>
    );
};

export default WebsiteDetail;