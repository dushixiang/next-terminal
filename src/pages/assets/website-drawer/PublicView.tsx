import React from 'react';
import { Alert, Card } from "antd";
import {
    ProFormCheckbox,
    ProFormDateTimePicker,
    ProFormDependency,
    ProFormSelect,
    ProFormSwitch,
    ProFormText,
    ProFormTextArea
} from "@ant-design/pro-components";
import { useTranslation } from "react-i18next";
import dayjs, { Dayjs } from "dayjs";

import { PublicViewProps } from "@/pages/assets/website-drawer/types";

const PublicView: React.FC<PublicViewProps> = ({ timeLimit, onTimeLimitChange, expiredAt, onExpiredAtChange }) => {
    const { t } = useTranslation();

    const disabledDate = (current: Dayjs) => {
        return current && current < dayjs();
    };

    return (
        <div className="flex flex-col gap-4">
            <Alert
                type="warning"
                message={t('assets.public_tip')}
                showIcon
                className="mb-2 bg-amber-50/60 dark:bg-amber-900/20"
            />

            <Card size="small" className="bg-slate-50/60 dark:bg-slate-900/40">
                <ProFormSwitch
                    label={t('general.enabled')}
                    name={['public', 'enabled']}
                    fieldProps={{
                        checkedChildren: t('general.yes'),
                        unCheckedChildren: t('general.no'),
                    }}
                />
            </Card>

            <ProFormDependency name={['public', 'enabled']}>
                {(values) => {
                    if (!values?.public?.enabled) return null;

                    return (
                        <div className="flex flex-col gap-4">
                            <Card size="small" className="bg-slate-50/60 dark:bg-slate-900/40">
                                <ProFormTextArea
                                    label={t('assets.limit_ip')}
                                    name={['public', 'ip']}
                                    extra={t('assets.limit_ip_tip')}
                                    placeholder="192.168.1.0/24"
                                    fieldProps={{ rows: 3 }}
                                />
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                    <ProFormSelect
                                        label={t('assets.limit_country')}
                                        name={['public', 'countries']}
                                        extra={t('assets.limit_country_tip')}
                                        placeholder={t('assets.limit_country_placeholder')}
                                        fieldProps={{ mode: 'tags' }}
                                        tooltip={t('assets.limit_geo_input_tip')}
                                    />
                                    <ProFormSelect
                                        label={t('assets.limit_province')}
                                        name={['public', 'provinces']}
                                        extra={t('assets.limit_province_tip')}
                                        placeholder={t('assets.limit_province_placeholder')}
                                        fieldProps={{ mode: 'tags' }}
                                        tooltip={t('assets.limit_geo_input_tip')}
                                    />
                                    <ProFormSelect
                                        label={t('assets.limit_city')}
                                        name={['public', 'cities']}
                                        extra={t('assets.limit_city_tip')}
                                        placeholder={t('assets.limit_city_placeholder')}
                                        fieldProps={{ mode: 'tags' }}
                                        tooltip={t('assets.limit_geo_input_tip')}
                                    />
                                </div>
                                <ProFormCheckbox
                                    label={t('assets.limit_time_enabled')}
                                    name={['public', 'timeLimit']}
                                    valuePropName="checked"
                                    fieldProps={{
                                        checked: timeLimit,
                                        onChange: (e) => onTimeLimitChange(e.target.checked),
                                    }}
                                />

                                {timeLimit && (
                                    <ProFormDateTimePicker
                                        label={t('assets.limit_time')}
                                        name={['public', 'expiredAt']}
                                        fieldProps={{
                                            allowClear: true,
                                            disabledDate,
                                            value: expiredAt,
                                            onChange: onExpiredAtChange,
                                        }}
                                    />
                                )}
                            </Card>

                            <Card size="small" className="bg-rose-50/60 dark:bg-rose-900/20">
                                <ProFormText.Password
                                    label={t('assets.limit_password')}
                                    name={['public', 'password']}
                                    extra={t('assets.limit_password_tip')}
                                    placeholder="password123"
                                    fieldProps={{
                                        autoComplete: 'new-password',
                                        name: 'public-access-password',
                                        spellCheck: false,
                                    }}
                                />
                            </Card>

                        </div>
                    );
                }}
            </ProFormDependency>
        </div>
    );
};

export default PublicView;
