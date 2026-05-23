import React from 'react';
import { Button, Form, Space, Switch, Typography } from "antd";
import { SettingProps } from "./SettingPage";
import { useTranslation } from "react-i18next";
import { useFormRequest } from "@/hook/use-antd-form-query";
const {
  Title
} = Typography;
const RdpSetting = ({
  get,
  set
}: SettingProps) => {
  const [form] = Form.useForm();
  let {
    t
  } = useTranslation();
  const renderSwitchItem = (name: string, label: string) => <Form.Item name={name} label={label} rules={[{
    required: true
  }]} valuePropName="checked">
            <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')} />
        </Form.Item>;
  useFormRequest(form, ['settings', 'rdp'], get);
  return <div>
            <Title level={5} style={{
      marginTop: 0
    }}>{t('settings.rdp.setting')}</Title>
            <Form form={form} layout="vertical" onFinish={set}>
                {renderSwitchItem('enable-wallpaper', t('settings.rdp.enable.wallpaper'))}
                {renderSwitchItem('enable-theming', t("settings.rdp.enable.theming"))}
                {renderSwitchItem('enable-font-smoothing', t("settings.rdp.enable.font_smoothing"))}
                {renderSwitchItem('enable-full-window-drag', t("settings.rdp.enable.full_window_drag"))}
                {renderSwitchItem('enable-desktop-composition', t("settings.rdp.enable.desktop_composition"))}
                {renderSwitchItem('enable-menu-animations', t("settings.rdp.enable.menu_animations"))}
                {renderSwitchItem('disable-bitmap-caching', t("settings.rdp.disable.bitmap_caching"))}
                {renderSwitchItem('disable-offscreen-caching', t("settings.rdp.disable.offscreen_caching"))}
                <Form.Item>
                    <Space>
                        <Button type="primary" htmlType="submit">{t('actions.save')}</Button>
                    </Space>
                </Form.Item>
            </Form>
        </div>;
};
export default RdpSetting;
