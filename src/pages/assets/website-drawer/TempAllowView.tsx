import React from 'react';
import { Card } from "antd";
import { ProFormDependency, ProFormDigit, ProFormSwitch } from "@ant-design/pro-components";
import { useTranslation } from "react-i18next";

const TempAllowView: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col gap-4">
            <Card size="small" className="bg-emerald-50/60 dark:bg-emerald-900/20">
                <ProFormSwitch
                    label={t('assets.temp_allow_enabled')}
                    name={['tempAllow', 'enabled']}
                    fieldProps={{
                        checkedChildren: t('general.yes'),
                        unCheckedChildren: t('general.no'),
                    }}
                />
                <ProFormDependency name={['tempAllow', 'enabled']}>
                    {(values) => {
                        if (!values?.tempAllow?.enabled) return null;
                        return (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <ProFormDigit
                                    label={t('assets.temp_allow_duration')}
                                    name={['tempAllow', 'durationMinutes']}
                                    extra={t('assets.temp_allow_duration_tip')}
                                    initialValue={5}
                                    fieldProps={{ min: 1 }}
                                    addonAfter={t('general.minute')}
                                />
                                <ProFormSwitch
                                    label={t('assets.temp_allow_auto_renew')}
                                    name={['tempAllow', 'autoRenew']}
                                    fieldProps={{
                                        checkedChildren: t('general.yes'),
                                        unCheckedChildren: t('general.no'),
                                    }}
                                    extra={t('assets.temp_allow_auto_renew_tip')}
                                />
                            </div>
                        );
                    }}
                </ProFormDependency>
            </Card>
        </div>
    );
};

export default TempAllowView;
