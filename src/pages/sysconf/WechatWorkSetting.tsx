import React, {useState} from 'react';
import {Alert, Button, Form, Input, Switch} from "antd";
import {SettingProps} from "./SettingPage";
import {useTranslation} from "react-i18next";
import Disabled from "@/components/Disabled";
import {useLicense} from "@/hook/LicenseContext";
import departmentApi from "@/api/department-api";
import ProFormTreeSelect from "@/components/ProFormTreeSelect";
import {useFormRequest} from "@/hook/use-antd-form-query";

const WechatWorkSetting = ({
                               get,
                               set
                           }: SettingProps) => {
    let {t} = useTranslation();
    const [form] = Form.useForm();
    let [enabled, setEnabled] = useState(false);
    let {
        license
    } = useLicense();
    const wrapGet = async () => {
        let data = await get();
        setEnabled(data['wechat-work-enabled']);
        return data;
    };
    useFormRequest(form, ["form-request", "web/src/pages/sysconf/WechatWorkSetting.tsx"], wrapGet, true);
    return <div>
        <Disabled disabled={!license.isEnterprise()}>
            <Alert title={t('settings.wechat_work.tip')} type="info" showIcon style={{
                marginBottom: 16
            }}/>
            <Form form={form} onFinish={set} layout="vertical">
                <Form.Item name="wechat-work-enabled" label={t("settings.wechat_work.enabled")} rules={[{
                    required: true
                }]} valuePropName="checked">
                    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}
                            onChange={setEnabled}/>
                </Form.Item>
                <Form.Item name="wechat-work-corp-id" label={t('settings.wechat_work.corp_id')} rules={[{
                    required: enabled
                }]}>
                    <Input placeholder={t('settings.wechat_work.corp_id_placeholder')} disabled={!enabled}/>
                </Form.Item>
                <Form.Item name="wechat-work-agent-id" label={t('settings.wechat_work.agent_id')} rules={[{
                    required: enabled
                }]}>
                    <Input placeholder={t('settings.wechat_work.agent_id_placeholder')} disabled={!enabled}/>
                </Form.Item>
                <Form.Item name="wechat-work-secret" label={t('settings.wechat_work.secret')} rules={[{
                    required: enabled
                }]}>
                    <Input.Password placeholder="******" disabled={!enabled}/>
                </Form.Item>
                <Form.Item name="wechat-work-redirect-uri" label={t('identity.oidc_client.redirect_uris')} rules={[{
                    required: enabled
                }]}>
                    <Input placeholder={t('settings.wechat_work.redirect_uri_placeholder')} disabled={!enabled}/>
                </Form.Item>
                <ProFormTreeSelect name="wechat-work-department" label={t('settings.oidc.department')}
                                   placeholder={t('settings.oidc.department_placeholder')} disabled={!enabled}
                                   fieldProps={{
                                       showSearch: true,
                                       treeDefaultExpandAll: true,
                                       treeNodeFilterProp: "title"
                                   }} request={async () => {
                    return await departmentApi.getTree();
                }}/>

                <Form.Item>
                    <Button type="primary" htmlType="submit">{t("actions.save")}</Button>
                </Form.Item>
            </Form>
        </Disabled>
    </div>;
};
export default WechatWorkSetting;
