import React from 'react';
import { Card } from "antd";
import { ProFormDependency, ProFormSelect, ProFormSwitch } from "@ant-design/pro-components";
import { useTranslation } from "react-i18next";

import certificateApi from "@/api/certificate-api";

const CertView: React.FC = () => {
    const { t } = useTranslation();

    const certificateRequest = async () => {
        const certificates = await certificateApi.getAll();
        return certificates.map(item => ({
            label: item.commonName,
            value: item.id,
        }));
    };

    return (
        <div className="flex flex-col gap-4">
            <Card size="small" className="bg-slate-50/60 dark:bg-slate-900/40">
                <ProFormSwitch
                    label={t('general.enabled')}
                    name={['cert', 'enabled']}
                    fieldProps={{
                        checkedChildren: t('general.yes'),
                        unCheckedChildren: t('general.no'),
                    }}
                />
            </Card>

            <ProFormDependency name={['cert', 'enabled']}>
                {({ cert }) => {
                    if (!cert?.enabled) return null;

                    return (
                        <Card size="small" className="bg-emerald-50/60 dark:bg-emerald-900/20">
                            <ProFormSelect
                                label={t('assets.cert')}
                                name={['cert', 'certId']}
                                rules={[{ required: true }]}
                                request={certificateRequest}
                                placeholder={t('assets.cert')}
                                showSearch
                            />
                        </Card>
                    );
                }}
            </ProFormDependency>
        </div>
    );
};

export default CertView;
