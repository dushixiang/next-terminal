import React from 'react';
import {Button, Layout, Result, Space} from "antd";
import {Link, useNavigate} from "react-router-dom";

const {Content} = Layout;

const NoPermission = () => {

    const navigate = useNavigate();

    return (
        <div>
            <Content>
                <Result
                    status="403"
                    title="403"
                    subTitle="抱歉，您似乎没有此页面的权限。"
                    extra={
                        <Space>
                            <Button type="primary" onClick={() => {navigate(-1);}}>返回上一页</Button>
                            <Button type="primary"><Link to={'/my-asset'}>我的资产</Link></Button>
                            <Button type="primary"><Link to={'/'}>后台首页</Link></Button>
                        </Space>
                    }
                />
            </Content>
        </div>
    );
};

export default NoPermission;