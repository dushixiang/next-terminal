import React, {useEffect, useState} from 'react';
import {Alert, App, Card, Col, Form, Row, Typography} from "antd";
import {SettingProps} from "./SettingPage";
import {useQuery} from "@tanstack/react-query";
import {ProForm, ProFormDigit, ProFormSwitch, ProFormText, ProFormTextArea} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import requests from "@/src/api/core/requests";
import propertyApi from "@/src/api/property-api";

const {Title} = Typography;

const MailSetting = ({get, set}: SettingProps) => {

    let {t} = useTranslation();
    const [form] = Form.useForm();

    let [enabled, setEnabled] = useState(false);
    let {message} = App.useApp();

    let query = useQuery({
        queryKey: ['get-property'],
        queryFn: get,
    });

    useEffect(() => {
        if (query.data) {
            form.setFieldsValue(query.data);
            setEnabled(query.data['mail-enabled']);
        }
    }, [query.data]);

    const handleSendTestMail = async (values: any) => {
        await propertyApi.sendMail(values);
        message.success(t('general.success'));
    }

    return (
        <div>
            <Title level={5} style={{marginTop: 0}}>{t('settings.mail.setting')}</Title>
            <Row gutter={16}>
                <Col span={12}>
                    <Card>
                        <ProForm onFinish={set} request={get}>
                            <ProFormSwitch name="mail-enabled"
                                           label={t('settings.mail.enabled')}
                                           rules={[{required: true}]}
                                           checkedChildren={t('general.enabled')}
                                           unCheckedChildren={t('general.disabled')}
                                           fieldProps={{
                                               checked: enabled,
                                               onChange: setEnabled,
                                           }}
                            />
                            <ProFormText name="mail-host"
                                         label={t('settings.mail.host')}
                                         required={enabled}
                                         disabled={!enabled}
                            />
                            <ProFormDigit name="mail-port"
                                          label={t('settings.mail.port')}
                                          required={enabled}
                                          disabled={!enabled}
                                          min={1}
                                          max={65535}
                                          fieldProps={{
                                              precision: 0 // 只允许整数
                                          }}
                            />
                            <ProFormText name="mail-username"
                                         label={t('settings.mail.username')}
                                         required={enabled}
                                         disabled={!enabled}
                            />
                            <ProFormText.Password name="mail-password"
                                         label={t('settings.mail.password')}
                                         required={enabled}
                                         disabled={!enabled}
                            />
                            <ProFormText name="mail-from"
                                         label={t('settings.mail.from')}
                                         placeholder={'name <username>'}
                                         disabled={!enabled}
                            />
                            <ProFormSwitch name="mail-use-ssl"
                                           label={'SSL'}
                                           disabled={!enabled}
                                           checkedChildren={t('general.enabled')}
                                           unCheckedChildren={t('general.disabled')}
                            />
                            <ProFormSwitch name="mail-insecure-skip-verify"
                                           label={'Server Name Insecure Skip Verify'}
                                           disabled={!enabled}
                                           checkedChildren={t('general.enabled')}
                                           unCheckedChildren={t('general.disabled')}
                            />
                        </ProForm>
                    </Card>
                </Col>
                <Col span={12}>
                    <Card>
                        <Alert
                            message={t('settings.mail.tip')}
                            type="warning"
                            style={{marginBottom: 10}}
                        />
                        <ProForm onFinish={handleSendTestMail} submitter={{
                            searchConfig: {submitText: t('settings.mail.send'),},
                            // 配置按钮的属性
                            resetButtonProps: {
                                style: {
                                    // 隐藏重置按钮
                                    display: 'none',
                                },
                            },
                        }}>
                            <ProFormText name="mail" label={t('settings.mail.mail')} rules={[{required: true}]}/>
                            <ProFormText name="title" label={t('settings.mail.title')} rules={[{required: true}]}/>
                            <ProFormTextArea name="content" label={t('settings.mail.content')} rules={[{required: true}]}
                                             fieldProps={{rows: 4}}/>
                        </ProForm>
                    </Card>
                </Col>
            </Row>

        </div>
    );
};

export default MailSetting;