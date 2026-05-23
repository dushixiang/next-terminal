import React from 'react';
import { Alert, Card, Form, Switch, Input, Select, Checkbox, DatePicker } from "antd";
import { useTranslation } from "react-i18next";
import dayjs, { Dayjs } from "dayjs";
import { PublicViewProps } from "@/pages/assets/website-drawer/types";
const PublicView: React.FC<PublicViewProps> = ({
  timeLimit,
  onTimeLimitChange,
  expiredAt,
  onExpiredAtChange
}) => {
  const {
    t
  } = useTranslation();
  const disabledDate = (current: Dayjs) => {
    return current && current < dayjs();
  };
  return <div className="flex flex-col gap-4">
            <Alert type="warning" title={t('assets.public_tip')} showIcon className="mb-2 bg-amber-50/60 dark:bg-amber-900/20" />

            <Card size="small" className="bg-slate-50/60 dark:bg-slate-900/40">
                <Form.Item label={t('general.enabled')} name={['public', 'enabled']} valuePropName="checked">
    <Switch
          checkedChildren={t('general.yes')}
          unCheckedChildren={t('general.no')} />
      </Form.Item>
            </Card>

            <Form.Item noStyle={true} shouldUpdate={true}>{form => (values => {
        if (!values?.public?.enabled) return null;
        return <div className="flex flex-col gap-4">
                            <Card size="small" className="bg-slate-50/60 dark:bg-slate-900/40">
                                <Form.Item label={t('assets.limit_ip')} name={['public', 'ip']} extra={t('assets.limit_ip_tip')}>
    <Input.TextArea
                autoSize={{minRows: 3, maxRows: 8}}
                placeholder={"192.168.1.0/24\n10.0.0.1\n172.16.0.1-172.16.0.255"} />
            </Form.Item>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                    <Form.Item label={t('assets.limit_country')} name={['public', 'countries']} extra={t('assets.limit_country_tip')} tooltip={t('assets.limit_geo_input_tip')}>
    <Select
                  mode='tags'
                  placeholder={t('assets.limit_country_placeholder')} />
              </Form.Item>
                                    <Form.Item label={t('assets.limit_province')} name={['public', 'provinces']} extra={t('assets.limit_province_tip')} tooltip={t('assets.limit_geo_input_tip')}>
    <Select
                  mode='tags'
                  placeholder={t('assets.limit_province_placeholder')} />
              </Form.Item>
                                    <Form.Item label={t('assets.limit_city')} name={['public', 'cities']} extra={t('assets.limit_city_tip')} tooltip={t('assets.limit_geo_input_tip')}>
    <Select
                  mode='tags'
                  placeholder={t('assets.limit_city_placeholder')} />
              </Form.Item>
                                </div>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <Form.Item label={t('assets.public_header_whitelist')} name={['public', 'headerWhitelist']} extra={t('assets.public_header_whitelist_tip')}>
    <Select
                  mode='tags'
                  tokenSeparators={[',']}
                  placeholder={t('assets.public_header_whitelist_placeholder')} />
              </Form.Item>
                                    <Form.Item label={t('assets.public_path_whitelist')} name={['public', 'pathWhitelist']} extra={t('assets.public_path_whitelist_tip')}>
    <Select
                  mode='tags'
                  tokenSeparators={[',']}
                  placeholder={t('assets.public_path_whitelist_placeholder')} />
              </Form.Item>
                                </div>
                                <Form.Item name={['public', 'timeLimit']} valuePropName="checked">
    <Checkbox
                checked={timeLimit}
                onChange={e => onTimeLimitChange(e.target.checked)}>{t('assets.limit_time_enabled')}</Checkbox>
            </Form.Item>

                                {timeLimit && <Form.Item label={t('assets.limit_time')} name={['public', 'expiredAt']}>
    <DatePicker
                allowClear={true}
                disabledDate={disabledDate}
                value={expiredAt}
                onChange={onExpiredAtChange}
                showTime={true} />
            </Form.Item>}
                            </Card>

                            <Card size="small" className="bg-rose-50/60 dark:bg-rose-900/20">
                                <Form.Item label={t('assets.limit_password')} name={['public', 'password']} extra={t('assets.limit_password_tip')}>
    <Input.Password
                autoComplete='new-password'
                name='public-access-password'
                spellCheck={false}
                placeholder="password123" />
            </Form.Item>
                            </Card>

                        </div>;
      })(form.getFieldsValue(true))}</Form.Item>
        </div>;
};
export default PublicView;
