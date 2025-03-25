import React from 'react';
import {Spin} from "antd";

const Landing = () => {
    return (
        <div className={'flex justify-center items-center h-screen'}>
            <Spin tip="正在努力加载中...">
                <div style={{width: 800}}></div>
            </Spin>
        </div>
    )
};

export default Landing;