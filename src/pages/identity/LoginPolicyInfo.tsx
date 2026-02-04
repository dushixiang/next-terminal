import React from 'react';
import {ProDescriptions} from "@ant-design/pro-components";
import loginPolicyApi, {LoginPolicy} from "../../api/login-policy-api";
import strings from "../../utils/strings";
import {TimePeriod, WeekMapping} from "../../components/drag-weektime/DragWeekTime";
import {useTranslation} from "react-i18next";
import {Tag} from "antd";
import {SafetyCertificateOutlined, StopOutlined} from "@ant-design/icons";

const LoginPolicyInfo = ({id}: any) => {

    let {t} = useTranslation();
    const get = async () => {
        let data = await loginPolicyApi.getById(id);
        return {
            success: true,
            data: data
        }
    }

    const weekMapping: WeekMapping = {
        0: t('dw.week.days.sunday'),
        1: t('dw.week.days.monday'),
        2: t('dw.week.days.tuesday'),
        3: t('dw.week.days.wednesday'),
        4: t('dw.week.days.thursday'),
        5: t('dw.week.days.friday'),
        6: t('dw.week.days.saturday'),
    };

    return (
        <div className={'page-detail-info'}>
            <ProDescriptions<LoginPolicy> column={1} request={get}>
                <ProDescriptions.Item label={t('general.name')} dataIndex="name"/>
                <ProDescriptions.Item label={t('identity.policy.priority')} dataIndex="priority"/>
                <ProDescriptions.Item label={t('identity.policy.ip_group')} dataIndex="ipGroup"/>
                <ProDescriptions.Item
                    label={t('identity.policy.time_period')} dataIndex="timePeriod"
                    render={(timePeriod, entity) => {
                        if (!timePeriod) {
                            return;
                        }
                        const items = timePeriod as TimePeriod[];
                        return items.map(t => {
                            if (!strings.hasText(t.value)) {
                                return;
                            }
                            return <>{`${weekMapping[t.key]} ：${t.value}`}<br/></>;
                        })
                    }}>
                </ProDescriptions.Item>
                <ProDescriptions.Item
                    label={t('identity.policy.action.label')} dataIndex="rule"
                    render={(text) => {
                        if (text === 'allow') {
                            return <Tag icon={<SafetyCertificateOutlined/>} color="success" bordered={false}>
                                {t('identity.policy.action.allow')}
                            </Tag>;
                        } else {
                            return <Tag icon={<StopOutlined/>} color="error" bordered={false}>
                                {t('identity.policy.action.reject')}
                            </Tag>;
                        }
                    }}/>
                <ProDescriptions.Item label={t('general.status')} dataIndex="enabled"
                                      valueEnum={{
                                          true: {text: t('general.enabled'), status: 'success'},
                                          false: {text: t('general.disabled'), status: 'default'},
                                      }}
                />
                <ProDescriptions.Item label={t('general.created_at')} dataIndex="createdAt" valueType='dateTime'/>
            </ProDescriptions>
        </div>
    );
};

export default LoginPolicyInfo;