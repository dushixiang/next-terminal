import {useParams, useSearchParams} from "react-router-dom";
import {Tabs} from "antd";
import RoleInfo from "./RoleInfo";
import {useState} from "react";

const RoleDetail = () => {
    let params = useParams();
    const id = params['roleId'];
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
                    <Tabs.TabPane tab="基本信息" key="info">
                        <RoleInfo active={activeKey === 'info'} id={id}/>
                    </Tabs.TabPane>
                </Tabs>
            </div>
        </div>
    );
}

export default RoleDetail;