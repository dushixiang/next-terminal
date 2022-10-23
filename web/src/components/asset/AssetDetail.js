import React, {useState} from 'react';
import {useParams, useSearchParams} from "react-router-dom";
import {Tabs} from "antd";
import AssetInfo from "./AssetInfo";
import AssetUser from "./AssetUser";
import AssetUserGroup from "./AssetUserGroup";
import {hasMenu} from "../../service/permission";

const {TabPane} = Tabs;

const AssetDetail = () => {
    let params = useParams();
    const id = params['assetId'];
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
                    hasMenu('asset-detail') &&
                    <TabPane tab="基本信息" key="info">
                        <AssetInfo active={activeKey === 'info'} id={id}/>
                    </TabPane>
                }

                {
                    hasMenu('asset-authorised-user') &&
                    <TabPane tab="授权的用户" key="bind-user">
                        <AssetUser active={activeKey === 'bind-user'} id={id}/>
                    </TabPane>
                }
                {
                    hasMenu('asset-authorised-user-group') &&
                    <TabPane tab="授权的用户组" key="bind-user-group">
                        <AssetUserGroup active={activeKey === 'bind-user-group'} id={id}/>
                    </TabPane>
                }
            </Tabs>
        </div>
    );
};

export default AssetDetail;