import React from 'react';
import {ProFormDependency, ProFormDigit, ProFormSelect, ProFormSwitch} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";

interface DisplaySettingsProps {
    protocol: 'rdp' | 'vnc';
}

const DisplaySettings: React.FC<DisplaySettingsProps> = ({protocol}) => {
    const {t} = useTranslation();

    return (
        <>
            <ProFormSelect name={["attrs", "color-depth"]}
                           label={t("assets.color_depth")}
                           fieldProps={{
                               options: [
                                   {value: '', label: t('general.default')},
                                   {value: '8', label: '8'},
                                   {value: '16', label: '16'},
                                   {value: '24', label: '24'},
                                   {value: '32', label: '32'},
                               ]
                           }}
            />
            <ProFormSwitch
                name={["attrs", "force-lossless"]}
                label={t('assets.force_lossless')}
            />
            <ProFormDigit
                name={['attrs', 'width']}
                label={t('assets.width')}
                fieldProps={{
                    precision: 0 // 只允许整数
                }}
            />
            <ProFormDigit
                name={['attrs', 'height']}
                label={t('assets.height')}
                fieldProps={{
                    precision: 0 // 只允许整数
                }}
            />
            {protocol === 'rdp' && (
                <>
                    <ProFormSelect
                        name={["attrs", "resize-method"]}
                        label={t('assets.resize_method')}
                        fieldProps={{
                            options: [
                                {value: '', label: t('general.default')},
                                {value: 'display-update', label: t('assets.resize_methods.display_update')},
                                {value: 'reconnect', label: t('assets.resize_methods.reconnect')},
                            ]
                        }}
                    />
                    <ProFormDependency name={[["attrs", "resize-method"]]}>
                        {({attrs}) => {
                            const resizeMethod = attrs?.['resize-method'];
                            let description = t('assets.resize_method_extra');
                            
                            switch (resizeMethod) {
                                case 'display-update':
                                    description = t('assets.resize_methods.display_update_desc');
                                    break;
                                case 'reconnect':
                                    description = t('assets.resize_methods.reconnect_desc');
                                    break;
                                default:
                                    description = t('assets.resize_method_extra');
                            }
                            
                            return (
                                <div style={{
                                    marginTop: '-16px', 
                                    marginBottom: '16px', 
                                    marginLeft: 'calc(16.666667% + 8px)', // 与label宽度对齐
                                    fontSize: '12px', 
                                    color: '#666'
                                }}>
                                    {description}
                                </div>
                            );
                        }}
                    </ProFormDependency>
                </>
            )}
        </>
    );
};

export default DisplaySettings;
