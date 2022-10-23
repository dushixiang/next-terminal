import React, {useEffect, useState} from 'react';

import assetApi from "../../api/asset";
import {Descriptions} from "antd";

const api = assetApi;

const AssetInfo = ({active, id}) => {

    let [item, setItem] = useState({});

    useEffect(() => {
        const getItem = async (id) => {
            let item = await api.getById(id);
            if (item) {
                setItem(item);
            }
        };
        if (active && id) {
            getItem(id);
        }
    }, [active]);

    return (
        <div className={'page-detail-info'}>
            <Descriptions column={1}>
                <Descriptions.Item label="资产名称">{item['name']}</Descriptions.Item>
                <Descriptions.Item label="协议">{item['protocol']}</Descriptions.Item>
                <Descriptions.Item label="IP">{item['ip']}</Descriptions.Item>
                <Descriptions.Item label="端口">{item['port']}</Descriptions.Item>
                <Descriptions.Item label="标签">{item['tags']}</Descriptions.Item>
                {/*<Descriptions.Item label="类型">{item['type'] === 'regexp' ? '正则表达式' : '命令'}</Descriptions.Item>*/}
                <Descriptions.Item label="创建时间">{item['created']}</Descriptions.Item>
            </Descriptions>
        </div>
    );
};

export default AssetInfo;