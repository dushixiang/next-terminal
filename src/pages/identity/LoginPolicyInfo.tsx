import React from 'react';
import loginPolicyApi from "../../api/login-policy-api";
import strings from "../../utils/strings";
import {WeekMapping} from "../../components/drag-weektime/DragWeekTime";
import {useTranslation} from "react-i18next";
import {Descriptions, Spin, Tag} from "antd";
import {SafetyCertificateOutlined, StopOutlined} from "@ant-design/icons";
import {useQuery} from "@tanstack/react-query";
import times from "@/components/time/times";

const LoginPolicyInfo = ({id}: any) => {

    let {t} = useTranslation();
    const loginPolicyQuery = useQuery({
        queryKey: ['login-policy', id],
        queryFn: () => loginPolicyApi.getById(id),
        enabled: !!id,
    });

    const loginPolicy = loginPolicyQuery.data;

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
            <Spin spinning={loginPolicyQuery.isLoading}>
                <Descriptions column={1}>
                    <Descriptions.Item label={t('general.name')}>{loginPolicy?.name}</Descriptions.Item>
                    <Descriptions.Item label={t('identity.policy.priority')}>{loginPolicy?.priority}</Descriptions.Item>
                    <Descriptions.Item label={t('identity.policy.ip_group')}>{loginPolicy?.ipGroup}</Descriptions.Item>
                    <Descriptions.Item label={t('identity.policy.time_period')}>
                        {loginPolicy?.timePeriod
                            ?.map(t => {
                                if (!strings.hasText(t.value)) {
                                    return;
                                }
                                return <React.Fragment key={t.key}>{`${weekMapping[t.key]} ：${t.value}`}<br/></React.Fragment>;
                            })
                            .filter(Boolean) || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('identity.policy.action.label')}>
                        {loginPolicy?.rule === 'allow' ? (
                            <Tag icon={<SafetyCertificateOutlined/>} color="success" variant="filled">
                                {t('identity.policy.action.allow')}
                            </Tag>
                        ) : (
                            <Tag icon={<StopOutlined/>} color="error" variant="filled">
                                {t('identity.policy.action.reject')}
                            </Tag>
                        )}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('general.status')}>
                        {loginPolicy?.enabled ? (
                            <Tag color="success">{t('general.enabled')}</Tag>
                        ) : (
                            <Tag>{t('general.disabled')}</Tag>
                        )}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('general.created_at')}>
                        {loginPolicy?.createdAt ? times.format(loginPolicy.createdAt) : '-'}
                    </Descriptions.Item>
                </Descriptions>
            </Spin>
        </div>
    );
};

export default LoginPolicyInfo;
