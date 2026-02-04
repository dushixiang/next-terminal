import React, {useRef} from 'react';
import {
    ProForm,
    ProFormCheckbox,
    ProFormDatePicker,
    ProFormDigit,
    ProFormInstance,
    ProFormRadio,
    ProFormText
} from "@ant-design/pro-components";
import {Form, Typography} from "antd";
import DragWeekTime from "../../components/drag-weektime/DragWeekTime";
import loginPolicyApi, {LoginPolicy} from "../../api/login-policy-api";
import {useNavigate, useSearchParams} from "react-router-dom";
import {maybe} from "../../utils/maybe";
import {useMutation} from "@tanstack/react-query";
import dayjs from "dayjs";
import {useTranslation} from "react-i18next";

const {Title} = Typography;

const LoginPolicyPostPage = () => {

    const [searchParams, setSearchParams] = useSearchParams();
    let id = maybe(searchParams.get('loginPolicyId'), '');

    let {t} = useTranslation();
    const formRef = useRef<ProFormInstance>(null);
    let navigate = useNavigate();

    const get = async () => {
        if (id) {
            let data = await loginPolicyApi.getById(id);
            if (data.expirationAt === 0) {
                data.expirationAt = undefined;
            }
            // wkRef.current.reset();
            // wkRef.current.renderWeekTime(data.timePeriod);
            return data
        }

        return {
            ipGroup: '0.0.0.0/0',
            priority: 50,
            rule: 'reject',
            enabled: true
        } as LoginPolicy;
    }

    const postOrUpdate = async (values: any) => {
        if (values['expirationAt']) {
            values['expirationAt'] = dayjs(values['expirationAt']).unix() * 1000;
        } else {
            values['expirationAt'] = 0;
        }
        if (values['id']) {
            await loginPolicyApi.updateById(values['id'], values);
        } else {
            await loginPolicyApi.create(values);
        }
    }

    let mutation = useMutation({
        mutationFn: postOrUpdate,
        onSuccess: () => {
            navigate(-1)
        }
    });

    const wrapSet = async (values: any) => {
        formRef.current?.validateFields()
            .then(() => {
                mutation.mutate(values);
            })
    }

    return (
        <div className="px-4">
            <Title level={5} style={{marginTop: 0}}>{t('actions.new')}</Title>
            <ProForm formRef={formRef} request={get} onFinish={wrapSet}>
                <ProFormText hidden={true} name={'id'}/>
                <ProFormText name={'name'} label={t('general.name')} rules={[{required: true}]}/>
                <ProFormDigit name={'priority'}
                              label={t('identity.policy.priority')}
                              extra={t('identity.policy.priority_extra')}
                              rules={[{required: true}]}
                              fieldProps={{min: 1, max: 100}}
                />
                <ProFormText name={'ipGroup'} label={t('identity.policy.ip_group')}
                             extra={t('identity.policy.ip_group_extra')}
                             rules={[{required: true}]}/>
                <Form.Item label={t('identity.policy.time_period')} name='timePeriod'>
                    <DragWeekTime/>
                </Form.Item>
                <ProFormRadio.Group
                    label={t('identity.policy.action.label')} name='rule' rules={[{required: true}]}
                    options={[
                        {value: 'allow', label: t('identity.policy.action.allow')},
                        {value: 'reject', label: t('identity.policy.action.reject')},
                    ]}
                />
                <ProFormDatePicker label={t('assets.limit_time')} name='expirationAt'
                                   fieldProps={{format: 'YYYY-MM-DD HH:mm:ss', showTime: true}}/>
                <ProFormCheckbox label={t('general.status')} name='enabled' rules={[{required: true}]}/>
            </ProForm>
        </div>
    );
};

export default LoginPolicyPostPage;