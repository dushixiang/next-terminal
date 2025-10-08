import React, {useState} from 'react';
import {Alert, Typography} from "antd";
import {SettingProps} from "./SettingPage";
import {ProForm, ProFormSwitch, ProFormText, ProFormTreeSelect} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import Disabled from "@/src/components/Disabled";
import {useLicense} from "@/src/hook/use-license";
import departmentApi from "@/src/api/department-api";

const {Title} = Typography;

const WechatWorkSetting = ({get, set}: SettingProps) => {

    let {t} = useTranslation();
    let [enabled, setEnabled] = useState(false);
    let [license] = useLicense();

    const wrapGet = async () => {
        let data = await get();
        setEnabled(data['wechat-work-enabled']);
        return data;
    }

    return (
        <div>
            <Disabled disabled={!license.isEnterprise()}>
                <Alert
                    message={t('settings.wechat_work.tip')}
                    type="info"
                    showIcon
                    style={{marginBottom: 16}}
                />
                <ProForm onFinish={set}
                         request={wrapGet}
                         submitter={{
                             resetButtonProps: {
                                 style: {display: 'none'}
                             }
                         }}>
                    <ProFormSwitch name="wechat-work-enabled"
                                   label={t("settings.wechat_work.enabled")}
                                   rules={[{required: true}]}
                                   checkedChildren={t('general.enabled')}
                                   unCheckedChildren={t('general.disabled')}
                                   fieldProps={{
                                       checked: enabled,
                                       onChange: setEnabled,
                                   }}
                    />
                    <ProFormText name="wechat-work-corp-id"
                                 label={t('settings.wechat_work.corp_id')}
                                 placeholder={t('settings.wechat_work.corp_id_placeholder')}
                                 disabled={!enabled}
                                 rules={[{required: enabled}]}
                    />
                    <ProFormText name="wechat-work-agent-id"
                                 label={t('settings.wechat_work.agent_id')}
                                 placeholder={t('settings.wechat_work.agent_id_placeholder')}
                                 disabled={!enabled}
                                 rules={[{required: enabled}]}
                    />
                    <ProFormText.Password name="wechat-work-secret"
                                 label={t('settings.wechat_work.secret')}
                                 placeholder="******"
                                 disabled={!enabled}
                                 rules={[{required: enabled}]}
                    />
                    <ProFormText name="wechat-work-redirect-uri"
                                 label={t('settings.wechat_work.redirect_uri')}
                                 placeholder={t('settings.wechat_work.redirect_uri_placeholder')}
                                 disabled={!enabled}
                                 rules={[{required: enabled}]}
                    />
                    <ProFormTreeSelect
                        name="wechat-work-department"
                        label={t('settings.wechat_work.department')}
                        placeholder={t('settings.wechat_work.department_placeholder')}
                        disabled={!enabled}
                        fieldProps={{
                            showSearch: true,
                            treeDefaultExpandAll: true,
                            treeNodeFilterProp: "title",
                        }}
                        request={async () => {
                            return await departmentApi.getTree();
                        }}
                    />
                </ProForm>
            </Disabled>
        </div>
    );
};

export default WechatWorkSetting;