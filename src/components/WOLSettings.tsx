import { Form, Input, InputNumber, Switch, Space } from "antd";
import React from 'react';
import { useTranslation } from 'react-i18next';
interface WOLSettingsProps {}
const WOLSettings: React.FC<WOLSettingsProps> = () => {
  const {
    t
  } = useTranslation();
  return <>
            <Form.Item name={['attrs', 'wol-enabled']} label={t('assets.wol.enabled')} tooltip={t('assets.wol.settings')} valuePropName="checked">
    <Switch />
    </Form.Item>
            <Form.Item noStyle={true} shouldUpdate={true}>{form => (record => {
        if (!record['attrs'] || !record['attrs']['wol-enabled']) return null;
        return <>
                            <Form.Item name={['attrs', 'wol-mac-addr']} label={t('assets.wol.mac_addr')} rules={[{
            pattern: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
            message: t('assets.wol.mac_addr_invalid')
          }]}>
    <Input placeholder={t('assets.wol.mac_addr_placeholder')} />
          </Form.Item>
                            <Form.Item name={['attrs', 'wol-broadcast']} label={t('assets.wol.broadcast')} initialValue="255.255.255.255">
    <Input placeholder={t('assets.wol.broadcast_placeholder')} />
          </Form.Item>
                            <Form.Item label={t('assets.wol.wakeup_delay')} tooltip={t('assets.wol.wakeup_delay_tooltip')}>
    <Space.Compact block>
        <Form.Item name={['attrs', 'wol-wakeup-delay']} initialValue={30} noStyle>
        <InputNumber placeholder={t('assets.wol.wakeup_delay_placeholder')} min={0} max={300} />
        </Form.Item>
        <Space.Addon>{t('general.second')}</Space.Addon>
    </Space.Compact>
          </Form.Item>
                        </>;
      })(form.getFieldsValue(true), form)}</Form.Item>
        </>;
};
export default WOLSettings;
