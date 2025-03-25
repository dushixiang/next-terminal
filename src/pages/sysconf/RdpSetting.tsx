import React from 'react';
import {Typography} from "antd";
import {SettingProps} from "./SettingPage";
import {ProForm, ProFormSwitch} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";

const {Title} = Typography;

const RdpSetting = ({get, set}: SettingProps) => {

    let {t} = useTranslation();
    return (
        <div>
            <Title level={5} style={{marginTop: 0}}>{t('settings.rdp.setting')}</Title>
            <ProForm onFinish={set} request={get} autoFocus={false}>
                <ProFormSwitch name="enable-wallpaper"
                               label={t('settings.rdp.enable.wallpaper')}
                               rules={[{required: true}]}
                               checkedChildren={t('general.enabled')}
                               unCheckedChildren={t('general.disabled')}
                />
                <ProFormSwitch name="enable-theming"
                               label={t("settings.rdp.enable.theming")}
                               rules={[{required: true}]}
                               checkedChildren={t('general.enabled')}
                               unCheckedChildren={t('general.disabled')}
                />
                <ProFormSwitch name="enable-font-smoothing"
                               label={t("settings.rdp.enable.font_smoothing")}
                               rules={[{required: true}]}
                               checkedChildren={t('general.enabled')}
                               unCheckedChildren={t('general.disabled')}
                />
                <ProFormSwitch name="enable-full-window-drag"
                               label={t("settings.rdp.enable.full_window_drag")}
                               rules={[{required: true}]}
                               checkedChildren={t('general.enabled')}
                               unCheckedChildren={t('general.disabled')}
                />
                <ProFormSwitch name="enable-desktop-composition"
                               label={t("settings.rdp.enable.desktop_composition")}
                               rules={[{required: true}]}
                               checkedChildren={t('general.enabled')}
                               unCheckedChildren={t('general.disabled')}
                />
                <ProFormSwitch name="enable-menu-animations"
                               label={t("settings.rdp.enable.menu_animations")}
                               rules={[{required: true}]}
                               checkedChildren={t('general.enabled')}
                               unCheckedChildren={t('general.disabled')}
                />
                <ProFormSwitch name="disable-bitmap-caching"
                               label={t("settings.rdp.disable.bitmap_caching")}
                               rules={[{required: true}]}
                               checkedChildren={t('general.enabled')}
                               unCheckedChildren={t('general.disabled')}
                />
                <ProFormSwitch name="disable-offscreen-caching"
                               label={t("settings.rdp.disable.offscreen_caching")}
                               rules={[{required: true}]}
                               checkedChildren={t('general.enabled')}
                               unCheckedChildren={t('general.disabled')}
                />
            </ProForm>
        </div>
    );
};

export default RdpSetting;