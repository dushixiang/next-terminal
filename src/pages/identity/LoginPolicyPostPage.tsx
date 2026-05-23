import { useFormRequest } from "@/hook/use-antd-form-query";
import React, { useRef } from 'react';
import { FormInstance, Form, Typography, Input, InputNumber, Radio, DatePicker, Checkbox } from 'antd';
import DragWeekTime from "../../components/drag-weektime/DragWeekTime";
import loginPolicyApi, { LoginPolicy } from "../../api/login-policy-api";
import { useNavigate, useSearchParams } from "react-router-dom";
import { maybe } from "../../utils/maybe";
import { useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
const {
  Title
} = Typography;
const LoginPolicyPostPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  let id = maybe(searchParams.get('loginPolicyId'), '');
  let {
    t
  } = useTranslation();
  const formRef = useRef<FormInstance>(null);
  let navigate = useNavigate();
  const get = async () => {
    if (id) {
      let data = await loginPolicyApi.getById(id);
      if (data.expirationAt === 0) {
        data.expirationAt = undefined;
      }
      // wkRef.current.reset();
      // wkRef.current.renderWeekTime(data.timePeriod);
      return data;
    }
    return {
      ipGroup: '0.0.0.0/0',
      priority: 50,
      rule: 'reject',
      enabled: true
    } as LoginPolicy;
  };
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
  };
  let mutation = useMutation({
    mutationFn: postOrUpdate,
    onSuccess: () => {
      navigate(-1);
    }
  });
  const wrapSet = async (values: any) => {
    formRef.current?.validateFields().then(() => {
      mutation.mutate(values);
    });
  };
  useFormRequest(formRef, ["form-request", "web/src/pages/identity/LoginPolicyPostPage.tsx", id], get, true);
  return <div className="px-4">
            <Title level={5} style={{
      marginTop: 0
    }}>{t('actions.new')}</Title>
            <Form onFinish={wrapSet} ref={formRef} layout="vertical">
                <Form.Item hidden={true} name={'id'}>
    <Input />
      </Form.Item>
                <Form.Item name={'name'} label={t('general.name')} rules={[{
        required: true
      }]}>
    <Input />
      </Form.Item>
                <Form.Item name={'priority'} label={t('identity.policy.priority')} extra={t('identity.policy.priority_extra')} rules={[{
        required: true
      }]}>
    <InputNumber
          min={1}
          max={100}
        style={{
          width: "100%"
        }} />
      </Form.Item>
                <Form.Item name={'ipGroup'} label={t('identity.policy.ip_group')} extra={t('identity.policy.ip_group_extra')} rules={[{
        required: true
      }]}>
    <Input />
      </Form.Item>
                <Form.Item label={t('identity.policy.time_period')} name='timePeriod'>
                    <DragWeekTime />
                </Form.Item>
                <Form.Item label={t('identity.policy.action.label')} name='rule' rules={[{
        required: true
      }]}>
    <Radio.Group options={[{
          value: 'allow',
          label: t('identity.policy.action.allow')
        }, {
          value: 'reject',
          label: t('identity.policy.action.reject')
        }]} />
      </Form.Item>
                <Form.Item label={t('assets.limit_time')} name='expirationAt'>
    <DatePicker
          format='YYYY-MM-DD HH:mm:ss'
          showTime={true} />
      </Form.Item>
                <Form.Item name='enabled' rules={[{
        required: true
      }]} valuePropName="checked">
    <Checkbox>{t('general.status')}</Checkbox>
      </Form.Item>
            </Form>
        </div>;
};
export default LoginPolicyPostPage;
