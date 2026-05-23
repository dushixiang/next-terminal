import React, {useState} from 'react';
import {Alert, App, Button, Card, Form, Input, InputNumber, Switch, Typography} from "antd";
import {SettingProps} from "./SettingPage";
import {useTranslation} from "react-i18next";
import propertyApi from "@/api/property-api";
import {useFormRequest} from "@/hook/use-antd-form-query";

const {
    Title
} = Typography;
const MailSetting = ({
                         get,
                         set
                     }: SettingProps) => {

    let {t} = useTranslation();
    const [form] = Form.useForm();
    let [enabled, setEnabled] = useState(false);
    let {message} = App.useApp();
    const wrapGet = async () => {
        const values = await get();
        setEnabled(values['mail-enabled']);
        return values;
    };
    useFormRequest(form, ["form-request", "web/src/pages/sysconf/MailSetting.tsx"], wrapGet, true);
    const handleSendTestMail = async (values: any) => {
        await propertyApi.sendMail(values);
        message.success(t('general.success'));
    };
    return <div>
        <Title level={5} style={{marginTop: 0}}>{t('settings.mail.setting')}</Title>
        <div className={'grid grid-cols-1 gap-4 lg:grid-cols-2'}>
            <div>
                <Card>
                    <Form form={form} onFinish={set} layout="vertical">
                        <Form.Item name="mail-enabled" label={t('settings.mail.enabled')} rules={[{
                            required: true
                        }]} valuePropName="checked">
                            <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}
                                    onChange={setEnabled}/>
                        </Form.Item>
                        <Form.Item name="mail-host" label={t('settings.mail.host')} required={enabled}>
                            <Input disabled={!enabled}/>
                        </Form.Item>
                        <Form.Item name="mail-port" label={t('settings.mail.port')} required={enabled}>
                            <InputNumber disabled={!enabled} precision={0} min={1} max={65535} style={{
                                width: "100%"
                            }}/>
                        </Form.Item>
                        <Form.Item name="mail-username" label={t('settings.mail.username')} required={enabled}>
                            <Input disabled={!enabled}/>
                        </Form.Item>
                        <Form.Item name="mail-password" label={t('settings.mail.password')} required={enabled}>
                            <Input.Password disabled={!enabled}/>
                        </Form.Item>
                        <Form.Item name="mail-from" label={t('settings.mail.from')}>
                            <Input placeholder="name <username>" disabled={!enabled}/>
                        </Form.Item>
                        <Form.Item name="mail-use-ssl" label={'SSL'} valuePropName="checked">
                            <Switch disabled={!enabled} checkedChildren={t('general.enabled')}
                                    unCheckedChildren={t('general.disabled')}/>
                        </Form.Item>
                        <Form.Item name="mail-insecure-skip-verify" label={'Server Name Insecure Skip Verify'}
                                   valuePropName="checked">
                            <Switch disabled={!enabled} checkedChildren={t('general.enabled')}
                                    unCheckedChildren={t('general.disabled')}/>
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit">{t("actions.save")}</Button>
                        </Form.Item>
                    </Form>
                </Card>
            </div>
            <div>
                <Card>
                    <Alert title={t('settings.mail.tip')} type="warning" style={{
                        marginBottom: 10
                    }}/>
                    <Form onFinish={handleSendTestMail} layout="vertical">
                        <Form.Item name="mail" label={t('settings.mail.mail')} rules={[{
                            required: true
                        }]}>
                            <Input/>
                        </Form.Item>
                        <Form.Item name="title" label={t('settings.mail.title')} rules={[{
                            required: true
                        }]}>
                            <Input/>
                        </Form.Item>
                        <Form.Item name="content" label={t('settings.mail.content')} rules={[{
                            required: true
                        }]}>
                            <Input.TextArea rows={4}/>
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit">{t('settings.mail.send')}</Button>
                        </Form.Item>
                    </Form>
                </Card>
            </div>
        </div>

    </div>;
};
export default MailSetting;
