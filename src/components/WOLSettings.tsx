import React from 'react';
import {ProFormDependency, ProFormDigit, ProFormSwitch, ProFormText} from '@ant-design/pro-components';
import {useTranslation} from 'react-i18next';

interface WOLSettingsProps {
}

const WOLSettings: React.FC<WOLSettingsProps> = () => {
    const {t} = useTranslation();

    return (
        <>
            <ProFormSwitch
                name={['attrs', 'wol-enabled']}
                label={t('assets.wol.enabled')}
                tooltip={t('assets.wol.settings')}
            />
            <ProFormDependency name={['attrs', 'wol-enabled']}>
                {(record) => {
                    if (!record['attrs'] || !record['attrs']['wol-enabled']) return null;
                    return (
                        <>
                            <ProFormText
                                name={['attrs', 'wol-mac-addr']}
                                label={t('assets.wol.mac_addr')}
                                placeholder={t('assets.wol.mac_addr_placeholder')}
                                rules={[
                                    {
                                        pattern: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
                                        message: t('assets.wol.mac_addr_invalid'),
                                    },
                                ]}
                            />
                            <ProFormText
                                name={['attrs', 'wol-broadcast']}
                                label={t('assets.wol.broadcast')}
                                placeholder={t('assets.wol.broadcast_placeholder')}
                                initialValue="255.255.255.255"
                            />
                            <ProFormDigit
                                name={['attrs', 'wol-wakeup-delay']}
                                label={t('assets.wol.wakeup_delay')}
                                placeholder={t('assets.wol.wakeup_delay_placeholder')}
                                tooltip={t('assets.wol.wakeup_delay_tooltip')}
                                min={0}
                                max={300}
                                initialValue={30}
                                fieldProps={{
                                    addonAfter: t('general.second', {defaultValue: '秒'}),
                                }}
                            />
                        </>
                    );
                }}
            </ProFormDependency>
        </>
    );
};

export default WOLSettings;