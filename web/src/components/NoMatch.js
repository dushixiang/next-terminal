import React from 'react';
import {Button, Layout, Result, Space} from "antd";
import {Link, useNavigate} from "react-router-dom";

const {Content} = Layout;

const NoMatch = () => {

    let navigate = useNavigate();

    return (
        <div>
            <Content>
                <Result
                    status="404"
                    title="404"
                    subTitle="抱歉，您似乎到达了预期之外的页面。"
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

export default NoMatch;