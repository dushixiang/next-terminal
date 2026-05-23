import { useFormRequest } from "@/hook/use-antd-form-query";
import React, { useRef, useState } from 'react';
import { useTranslation } from "react-i18next";
import { Alert, Button, FormInstance, Result, Spin, Typography, Form, Input } from "antd";
import { useQuery } from "@tanstack/react-query";
import brandingApi from "@/api/branding-api";
import userApi from "@/api/user-api";
import { ValidateStatus } from "antd/es/form/FormItem";
import { StyleProvider } from '@ant-design/cssinjs';
import strings from "@/utils/strings";
const {
  Title
} = Typography;
const SetupPage = () => {
  let [ok, setOK] = useState<boolean>(false);
  let brandingQuery = useQuery({
    queryKey: ['branding'],
    queryFn: brandingApi.getBranding
  });
  let setupStatusQuery = useQuery({
    queryKey: ['setup-status'],
    queryFn: userApi.getSetupStatus,
    retry: false,
    initialData: {
      needSetup: true
    }
  });
  let [newPassword1, setNewPassword1] = useState('');
  let [newPassword2, setNewPassword2] = useState('');
  let [newPasswordStatus, setNewPasswordStatus] = useState<ValidateStatus>();
  let [error, setError] = useState<string>('');
  const formRef = useRef<FormInstance>(null);
  let {
    t
  } = useTranslation();
  const get = async () => {
    return {
      type: 'admin',
      recording: 'enabled',
      watermark: 'enabled'
    };
  };
  const handleSubmit = async (values: any) => {
    userApi.setupUser(values).then(() => {
      setOK(true);
    }).catch(result => {
      alert(result?.message);
    });
  };
  const onNewPasswordChange = async (event: any) => {
    setNewPassword1(event.target.value);
    let {
      status,
      error
    } = validateNewPassword(event.target.value, newPassword2);
    setNewPasswordStatus(status);
    setError(error);
  };
  const onNewPassword2Change = (value: any) => {
    setNewPassword2(value.target.value);
    let {
      status,
      error
    } = validateNewPassword(newPassword1, value.target.value);
    setNewPasswordStatus(status);
    setError(error);
  };
  const validateNewPassword = (newPassword1: string, newPassword2: string) => {
    if (newPassword2 === newPassword1) {
      return {
        status: 'success' as ValidateStatus,
        error: ''
      };
    }
    return {
      status: 'error' as ValidateStatus,
      error: t('identity.setup.password_not_same')
    };
  };
  const renderContent = () => {
    if (setupStatusQuery.isLoading) {
      return <div className={'flex justify-center py-6'}>
                <Spin />
            </div>;
    }
    if (ok) {
      return <Result status="success" title={t('identity.setup.success')} extra={[<Button type="link" key="go-login" href="/login">
                        {t('identity.setup.go_to_login')}
                    </Button>]} />;
    }
    if (!setupStatusQuery.data?.needSetup) {
      return <Result status="info" title={t('identity.setup.already_done_title')} subTitle={t('identity.setup.already_done_subtitle')} extra={[<Button type="link" key="go-login" href="/login">
                        {t('identity.setup.go_to_login')}
                    </Button>]} />;
    }
    return <div>
            {strings.hasText(error) && <div className={'mb-4'}>
                    <Alert showIcon type="warning" title={error} />
                </div>}
            <Form onFinish={handleSubmit} ref={formRef} layout="vertical">
                <Form.Item name={'username'} label={t('audit.operation.account')} rules={[{
          required: true
        }]}>
    <Input />
        </Form.Item>
                <Form.Item name={'password'} label={t('assets.password')} rules={[{
          required: true
        }]}>
    <Input.Password
            onChange={onNewPasswordChange} />
        </Form.Item>
                <Form.Item name={'newPassword2'} label={t('account.confirm_password')} rules={[{
          required: true
        }]} validateStatus={newPasswordStatus}>
    <Input.Password
            onChange={onNewPassword2Change} />
        </Form.Item>
            
        <Form.Item>
          <Button type="primary" htmlType="submit" disabled={strings.hasText(error)}>{t("actions.save")}</Button>
        </Form.Item>
      </Form>
        </div>;
  };
  useFormRequest(formRef, ["form-request", "web/src/pages/identity/SetupPage.tsx"], get, true);
  return <StyleProvider hashPriority="high">
            <div className="bg-gray-100 h-screen w-screen flex flex-col items-center justify-center">
                <div className={'bg-white rounded-lg shadow-md p-8 min-w-[480px]'}>
                    <div className={'flex flex-col items-center justify-center'}>
                        <Title level={2}>{brandingQuery.data?.name}</Title>
                        <div className={'font-medium mb-8'}>{t('identity.setup.user')}</div>
                    </div>

                    {renderContent()}

                </div>
            </div>
        </StyleProvider>;
};
export default SetupPage;
