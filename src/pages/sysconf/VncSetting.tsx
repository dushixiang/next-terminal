import React, {useEffect} from 'react';
import {Form, Typography} from "antd";
import {SettingProps} from "./SettingPage";
import {useQuery} from "@tanstack/react-query";
import {ProForm, ProFormDigit, ProFormSelect, ProFormSwitch} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";

const {Title} = Typography;

const VncSetting = ({get, set}: SettingProps) => {

    let {t} = useTranslation();
    const [form] = Form.useForm();

    let query = useQuery({
        queryKey: ['get-property'],
        queryFn: get,
    });

    useEffect(() => {
        if (query.data) {
            form.setFieldsValue(query.data);
        }
    }, [query.data]);

    return (
        <div>
            <Title level={5} style={{marginTop: 0}}>{t('settings.vnc.setting')}</Title>
            <ProForm onFinish={set} request={get} submitter={{
                resetButtonProps: {
                    style: {display: 'none'}
                }
            }}>
                <ProFormSelect name="color-depth"
                               label={t("settings.vnc.color_depth")}
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
                <ProFormSelect name="cursor"
                               label={t("settings.vnc.cursor.setting")}
                               fieldProps={{
                                   options: [
                                       {value: '', label: t('general.default')},
                                       {value: 'local', label: t('settings.vnc.cursor.local')},
                                       {value: 'remote', label: t('settings.vnc.cursor.remote')},
                                   ]
                               }}
                />
                <ProFormSwitch name="swap-red-blue"
                               label={t("settings.vnc.swap_red_blue")}
                               rules={[{required: true}]}
                               checkedChildren={t('general.enabled')}
                               unCheckedChildren={t('general.disabled')}
                />
            </ProForm>
        </div>
    );
};

export default VncSetting;