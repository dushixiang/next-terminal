import React from 'react';
import { Button, Form, Select, Space, Switch, Typography } from "antd";
import { SettingProps } from "./SettingPage";
import { useTranslation } from "react-i18next";
import { useFormRequest } from "@/hook/use-antd-form-query";
const {
  Title
} = Typography;
const VncSetting = ({
  get,
  set
}: SettingProps) => {
  const [form] = Form.useForm();
  let {
    t
  } = useTranslation();
  const wrapGet = async () => {
    const values = await get();
    return {
      ...values,
      'color-depth': values?.['color-depth'] ?? '',
      cursor: values?.cursor ?? ''
    };
  };
  useFormRequest(form, ['settings', 'vnc'], wrapGet);
  return <div>
            <Title level={5} style={{
      marginTop: 0
    }}>{t('settings.vnc.setting')}</Title>
            <Form form={form} layout="vertical" onFinish={set}>
                <Form.Item name="color-depth" label={t("assets.color_depth")}>
                    <Select options={[{
          value: '',
          label: t('general.default')
        }, {
          value: '8',
          label: '8'
        }, {
          value: '16',
          label: '16'
        }, {
          value: '24',
          label: '24'
        }, {
          value: '32',
          label: '32'
        }]} />
                </Form.Item>
                <Form.Item name="cursor" label={t("settings.vnc.cursor.setting")}>
                    <Select options={[{
          value: '',
          label: t('general.default')
        }, {
          value: 'local',
          label: t('identity.user.sources.local')
        }, {
          value: 'remote',
          label: t('settings.vnc.cursor.remote')
        }]} />
                </Form.Item>
                <Form.Item name="swap-red-blue" label={t("settings.vnc.swap_red_blue")} rules={[{
        required: true
      }]} valuePropName="checked">
                    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')} />
                </Form.Item>
                <Form.Item>
                    <Space>
                        <Button type="primary" htmlType="submit">{t('actions.save')}</Button>
                    </Space>
                </Form.Item>
            </Form>
        </div>;
};
export default VncSetting;
