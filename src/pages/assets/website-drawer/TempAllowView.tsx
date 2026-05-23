import React from 'react';
import { Card, Form, Switch, InputNumber, Space } from "antd";
import { useTranslation } from "react-i18next";
const TempAllowView: React.FC = () => {
  const {
    t
  } = useTranslation();
  return <div className="flex flex-col gap-4">
            <Card size="small" className="bg-emerald-50/60 dark:bg-emerald-900/20">
                <Form.Item label={t('assets.temp_allow')} name={['tempAllow', 'enabled']} valuePropName="checked">
    <Switch
          checkedChildren={t('general.yes')}
          unCheckedChildren={t('general.no')} />
      </Form.Item>
                <Form.Item noStyle={true} shouldUpdate={true}>{form => (values => {
          if (!values?.tempAllow?.enabled) return null;
          return <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <Form.Item label={t('assets.temp_allow_duration')} extra={t('assets.temp_allow_duration_tip')}>
    <Space.Compact block>
        <Form.Item name={['tempAllow', 'durationMinutes']} initialValue={5} noStyle>
        <InputNumber
                min={1} />
        </Form.Item>
        <Space.Addon>{t('general.minute')}</Space.Addon>
    </Space.Compact>
            </Form.Item>
                                <Form.Item label={t('assets.temp_allow_auto_renew')} name={['tempAllow', 'autoRenew']} extra={t('assets.temp_allow_auto_renew_tip')} valuePropName="checked">
    <Switch
                checkedChildren={t('general.yes')}
                unCheckedChildren={t('general.no')} />
            </Form.Item>
                            </div>;
        })(form.getFieldsValue(true), form)}</Form.Item>
            </Card>
        </div>;
};
export default TempAllowView;
