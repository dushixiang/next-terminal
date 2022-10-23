import React from 'react';
import {Button, Layout, Result} from "antd";
import {Link} from "react-router-dom";

const {Content} = Layout;

const NoMatch = () => {
    return (
        <div>
            <Content>
                <Result
                    status="404"
                    title="404"
                    subTitle="抱歉，您似乎到达了预期之外的页面。"
                    extra={<Button type="primary"><Link to={'/'}>回到首页</Link></Button>}
                />
            </Content>
        </div>
    );
};

export default NoMatch;