import React from 'react';
import {Tabs} from "antd";
import {ProFormCheckbox, ProFormSelect, ProFormSwitch, ProFormText, ProFormTextArea} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import DisplaySettings from './DisplaySettings';
import SecuritySettings from './SecuritySettings';
import WOLSettings from '../../../components/WOLSettings';
import storageApi from "@/api/storage-api";

interface AssetAdvancedSettingsProps {
    protocol: string;
}

const AssetAdvancedSettings: React.FC<AssetAdvancedSettingsProps> = ({protocol}) => {
    const {t} = useTranslation();

    const renderRDPTabs = () => [
        {
            key: 'security_settings',
            label: t('assets.security.settings'),
            forceRender: true,
            children: <SecuritySettings/>,
        },
        {
            key: 'display_settings',
            label: t('assets.display_settings'),
            children: <DisplaySettings protocol="rdp"/>,
        },
        {
            key: 'audio_settings',
            label: t('assets.audio_settings'),
            forceRender: true,
            children: (
                <>
                    <ProFormSwitch
                        name={["attrs", "disable-audio"]}
                        label={t('assets.disable_audio')}
                    />
                    <ProFormSwitch
                        name={["attrs", "enable-audio-input"]}
                        label={t('assets.enable_audio_input')}
                    />
                </>
            ),
        },
        {
            key: 'domain',
            label: t('assets.rdp_domain'),
            forceRender: true,
            children: (
                <ProFormText
                    name={['attrs', "domain"]}
                    label={t('assets.rdp_domain')}
                />
            ),
        },
        {
            key: 'PDU',
            label: 'PDU',
            forceRender: true,
            children: (
                <>
                    <ProFormText
                        name={["attrs", "preconnection-id"]}
                        label={t("assets.preconnection_id")}
                    />
                    <ProFormText
                        name={["attrs", "preconnection-blob"]}
                        label={t("assets.preconnection_blob")}
                    />
                </>
            ),
        },
        {
            key: 'remote-app',
            label: 'Remote App',
            forceRender: true,
            children: (
                <>
                    <ProFormText
                        name={["attrs", "remote-app"]}
                        label={t("assets.remote_app")}
                    />
                    <ProFormText
                        name={["attrs", "remote-app-dir"]}
                        label={t("assets.remote_app_dir")}
                    />
                    <ProFormText
                        name={["attrs", "remote-app-args"]}
                        label={t("assets.remote_app_args")}
                    />
                </>
            ),
        },
        {
            key: 'rdp-drive',
            label: t('assets.rdp_drive'),
            forceRender: true,
            children: (
                <>
                    <ProFormSwitch
                        name={["attrs", "enable-drive"]}
                        checkedChildren={t('general.enabled')}
                        unCheckedChildren={t('general.disabled')}
                        label={t('assets.rdp_enable_drive')}
                    />
                    <ProFormSelect
                        name={["attrs", "drive-path"]}
                        label={t('assets.rdp_drive_path')}
                        extra={t('assets.rdp_drive_path_extra')}
                        request={async () => {
                            let items = await storageApi.getShares();
                            return items.map(item => ({
                                label: item.name,
                                value: item.id,
                            }));
                        }}
                    />
                </>
            ),
        },
        {
            key: 'wol-settings',
            label: t('assets.wol.settings'),
            forceRender: true,
            children: <WOLSettings/>,
        },
    ];

    const renderVNCTabs = () => [
        {
            key: 'display_settings',
            label: t('assets.display_settings'),
            children: <DisplaySettings protocol="vnc"/>,
        },
        {
            key: 'wol-settings',
            label: t('assets.wol.settings'),
            children: <WOLSettings/>,
        },
    ];

    const renderTelnetTabs = () => [
        {
            key: 'wol-settings',
            label: t('assets.wol.settings'),
            children: <WOLSettings/>,
        },
    ];

    const renderSSHTabs = () => [
        {
            label: t('assets.terminal_settings'),
            key: 'terminal_settings',
            forceRender: true,
            children: (
                <div>
                    <ProFormCheckbox
                        name={['attrs', 'disableAliveCheck']}
                        label={t('assets.disable_alive_check')}
                        extra={t('assets.disable_alive_check_extra')}
                    />
                    <ProFormCheckbox
                        name={['attrs', 'disableDetectOS']}
                        label={t('assets.disable_detect_os')}
                        extra={t('assets.disable_detect_os_extra')}
                    />
                    <ProFormTextArea
                        label={t('assets.env')}
                        name={['attrs', 'env']}
                        placeholder={t('assets.env_placeholder')}
                        fieldProps={{
                            rows: 4,
                            allowClear: true,
                        }}
                    />
                </div>
            )
        },
        {
            key: 'wol-settings',
            label: t('assets.wol.settings'),
            forceRender: true,
            children: <WOLSettings/>,
        }
    ];

    const getTabs = () => {
        switch (protocol) {
            case 'rdp':
                return renderRDPTabs();
            case 'vnc':
                return renderVNCTabs();
            case 'telnet':
                return renderTelnetTabs();
            case 'ssh':
                return renderSSHTabs();
            default:
                return [];
        }
    };

    if (!protocol) {
        return null;
    }

    return <Tabs items={getTabs()}/>;
};

export default AssetAdvancedSettings;
