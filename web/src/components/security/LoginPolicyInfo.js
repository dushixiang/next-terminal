import React, {useEffect, useState} from 'react';
import {Descriptions} from "antd";
import {renderWeekDay} from "../../utils/week";
import {hasText} from "../../utils/utils";
import loginPolicyApi from "../../api/login-policy";

const LoginPolicyInfo = ({active, id}) => {

    let [item, setItem] = useState({});

    useEffect(() => {
        const getItem = async (id) => {
            let item = await loginPolicyApi.getById(id);
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
                <Descriptions.Item label="优先级">{item['priority']}</Descriptions.Item>
                <Descriptions.Item label="IP地址">{item['ipGroup']}</Descriptions.Item>
                <Descriptions.Item label="时段">
                    {
                        item['timePeriod']?.map(t => {
                            if (!hasText(t.value)) {
                                return;
                            }
                            return <>{`${renderWeekDay(t.key)} ：${t.value}`}<br/></>;
                        })
                    }
                </Descriptions.Item>
                <Descriptions.Item label="规则">{item['rule'] === 'allow' ? '允许' : '拒绝'}</Descriptions.Item>
                <Descriptions.Item label="激活">{item['enabled'] ? '✅' : '❌'}</Descriptions.Item>
            </Descriptions>
        </div>
    );
};

export default LoginPolicyInfo;