import React, {useEffect, useState} from 'react';
import {Descriptions, Tag} from "antd";
import userGroupApi from "../../api/user-group";

const api = userGroupApi;

const UserGroupInfo = ({active, id}) => {
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
                <Descriptions.Item label="名称">{item['name']}</Descriptions.Item>
                <Descriptions.Item label="成员">{item['members']?.map(item => <Tag>{item.name}</Tag>)}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{item['created']}</Descriptions.Item>
            </Descriptions>
        </div>
    );
};

export default UserGroupInfo;