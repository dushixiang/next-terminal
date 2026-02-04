import React from 'react';
import { Card } from "antd";
import {
    ProFormCheckbox,
    ProFormGroup,
    ProFormList,
    ProFormText
} from "@ant-design/pro-components";
import { useTranslation } from "react-i18next";

const HeaderView: React.FC = () => {
    const { t } = useTranslation();

    const headerItemRender = ({ listDom, action }: any) => (
        <Card size="small" className="mb-3 bg-slate-50/60 dark:bg-slate-900/40">
            <div className="flex items-center gap-2">
                <div className="flex-1">{listDom}</div>
                <div className="flex-shrink-0">{action}</div>
            </div>
        </Card>
    );

    return (
        <div className="flex flex-col gap-4">
            <Card size="small" className="bg-sky-50/60 dark:bg-sky-900/20">
                <ProFormCheckbox
                    name="preserveHost"
                    label={t('assets.preserve_host')}
                    extra={t('assets.preserve_host_tip')}
                />
            </Card>

            <div>
                <ProFormList
                    name="headers"
                    label={t('assets.custom_header')}
                    initialValue={[]}
                    tooltip={t('assets.custom_header_tip')}
                    itemRender={headerItemRender}
                >
                    <ProFormGroup key="group">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <ProFormText
                                name="name"
                                label={t('assets.header_key')}
                                placeholder="Content-Type"
                            />
                            <ProFormText
                                name="value"
                                label={t('assets.header_value')}
                                placeholder="application/json"
                            />
                        </div>
                    </ProFormGroup>
                </ProFormList>
            </div>
        </div>
    );
};

export default HeaderView;
