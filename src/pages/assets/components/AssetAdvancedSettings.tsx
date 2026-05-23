import QuerySelect from "@/components/QuerySelect";
import React from 'react';
import {Checkbox, Form, Input, Switch, Tabs, type TabsProps} from "antd";
import {useTranslation} from "react-i18next";
import DisplaySettings from './DisplaySettings';
import SecuritySettings from './SecuritySettings';
import WOLSettings from '../../../components/WOLSettings';
import storageApi from "@/api/storage-api";

interface AssetAdvancedSettingsProps {
    protocol: string;
}

export type AssetAdvancedSection = 'security_settings'
    | 'display_settings'
    | 'audio_settings'
    | 'domain'
    | 'PDU'
    | 'remote-app'
    | 'rdp-drive'
    | 'terminal_settings'
    | 'wol-settings';

const AudioSettings = () => {
    const {t} = useTranslation();

    return <>
        <Form.Item name={["attrs", "disable-audio"]} label={t('assets.disable_audio')} valuePropName="checked">
            <Switch/>
        </Form.Item>
        <Form.Item name={["attrs", "enable-audio-input"]} label={t('assets.enable_audio_input')}
                   valuePropName="checked">
            <Switch/>
        </Form.Item>
    </>;
};

const RdpDomainSettings = () => {
    const {t} = useTranslation();

    return <Form.Item name={['attrs', "domain"]} label={t('assets.rdp_domain')}>
        <Input/>
    </Form.Item>;
};

const PduSettings = () => {
    const {t} = useTranslation();

    return <>
        <Form.Item name={["attrs", "preconnection-id"]} label={t("assets.preconnection_id")}>
            <Input/>
        </Form.Item>
        <Form.Item name={["attrs", "preconnection-blob"]} label={t("assets.preconnection_blob")}>
            <Input/>
        </Form.Item>
    </>;
};

const RemoteAppSettings = () => {
    const {t} = useTranslation();

    return <>
        <Form.Item name={["attrs", "remote-app"]} label={t("assets.remote_app")}>
            <Input/>
        </Form.Item>
        <Form.Item name={["attrs", "remote-app-dir"]} label={t("assets.remote_app_dir")}>
            <Input/>
        </Form.Item>
        <Form.Item name={["attrs", "remote-app-args"]} label={t("assets.remote_app_args")}>
            <Input/>
        </Form.Item>
    </>;
};

const RdpDriveSettings = () => {
    const {t} = useTranslation();

    const loadStorageShares = async () => {
        const items = await storageApi.getShares();
        return items.map(item => ({
            label: item.name,
            value: item.id
        }));
    };

    return <>
        <Form.Item name={["attrs", "enable-drive"]} label={t('assets.rdp_drive')} valuePropName="checked">
            <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
        </Form.Item>
        <Form.Item name={["attrs", "drive-path"]} label={t('assets.rdp_drive_path')}
                   extra={t('assets.rdp_drive_path_extra')}>
            <QuerySelect request={loadStorageShares}/>
        </Form.Item>
    </>;
};

const SshTerminalSettings = () => {
    const {t} = useTranslation();

    return <div>
        <Form.Item name={['attrs', 'disableAliveCheck']}
                   extra={t('assets.disable_alive_check_extra')}
                   label={t('assets.disable_alive_check')}
                   valuePropName="checked">
            <Checkbox/>
        </Form.Item>
        <Form.Item name={['attrs', 'disableDetectOS']}
                   extra={t('assets.disable_detect_os_extra')}
                   valuePropName="checked"
                   label={t('assets.disable_detect_os')}
        >
            <Checkbox/>
        </Form.Item>
        <Form.Item label={t('assets.env')} name={['attrs', 'env']}>
            <Input.TextArea
                rows={4}
                allowClear
                placeholder={t('assets.env_placeholder')}
            />
        </Form.Item>
    </div>;
};

const wolTab = (label: React.ReactNode, forceRender?: boolean) => ({
    key: 'wol-settings',
    label,
    forceRender,
    children: <WOLSettings/>
});

export const getAssetAdvancedItems = (protocol: string, t: (key: string) => string): TabsProps['items'] => {
    const rdpTabs: TabsProps['items'] = [{
        key: 'security_settings',
        label: t('assets.security.settings'),
        forceRender: true,
        children: <SecuritySettings/>
    }, {
        key: 'display_settings',
        label: t('assets.display_settings'),
        children: <DisplaySettings protocol="rdp"/>
    }, {
        key: 'audio_settings',
        label: t('assets.audio_settings'),
        forceRender: true,
        children: <AudioSettings/>
    }, {
        key: 'domain',
        label: t('assets.rdp_domain'),
        forceRender: true,
        children: <RdpDomainSettings/>
    }, {
        key: 'PDU',
        label: 'PDU',
        forceRender: true,
        children: <PduSettings/>
    }, {
        key: 'remote-app',
        label: 'Remote App',
        forceRender: true,
        children: <RemoteAppSettings/>
    }, {
        key: 'rdp-drive',
        label: t('assets.rdp_drive'),
        forceRender: true,
        children: <RdpDriveSettings/>
    }, wolTab(t('assets.wol.settings'), true)];

    const sshTabs: TabsProps['items'] = [{
        label: t('assets.terminal_settings'),
        key: 'terminal_settings',
        forceRender: true,
        children: <SshTerminalSettings/>
    }, wolTab(t('assets.wol.settings'), true)];

    const vncTabs: TabsProps['items'] = [{
        key: 'display_settings',
        label: t('assets.display_settings'),
        children: <DisplaySettings protocol="vnc"/>
    }, wolTab(t('assets.wol.settings'))];

    const telnetTabs: TabsProps['items'] = [
        wolTab(t('assets.wol.settings'))
    ];

    const tabsByProtocol: Record<string, TabsProps['items']> = {
        rdp: rdpTabs,
        ssh: sshTabs,
        vnc: vncTabs,
        telnet: telnetTabs
    };
    const items = tabsByProtocol[protocol];

    if (!items) {
        return [];
    }
    return items;
};

const AssetAdvancedSettings: React.FC<AssetAdvancedSettingsProps> = ({protocol}) => {
    const {t} = useTranslation();
    const items = getAssetAdvancedItems(protocol, t);

    if (items.length === 0) {
        return null;
    }
    return <Tabs tabPlacement="start" items={items}/>;
};

export default AssetAdvancedSettings;
