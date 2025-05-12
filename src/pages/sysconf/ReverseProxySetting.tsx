import React, {useRef, useState} from 'react';
import {Alert, Col, Row, Typography} from "antd";
import {SettingProps} from "./SettingPage";
import {
    ProForm,
    ProFormCheckbox,
    ProFormDependency,
    ProFormInstance, ProFormSelect,
    ProFormSwitch,
    ProFormText,
    ProFormTextArea
} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";

const {Title} = Typography;

const ReverseProxySetting = ({get, set}: SettingProps) => {

    let {t} = useTranslation();
    const formRef = useRef<ProFormInstance>();
    let [enabled, setEnabled] = useState(false);
    let [ipTrustList, setIpTrustList] = useState<string[]>([]);

    const wrapSet = async (values: any) => {
        formRef.current?.validateFields()
            .then(() => {
                set(values);
            })
    }

    const wrapGet = async () => {
        let values = await get();
        setEnabled(values['reverse-proxy-server-enabled']);
        return values;
    }

    const getRootPath = () => {
        // 获取当前url根路径
        return window.location.origin;
    }

    return (
        <div>
            <Title level={5} style={{marginTop: 0}}>{t('settings.rp.setting')}</Title>
            <Alert
                message={
                    <div>{t('settings.rp.tip')}</div>}
                type="info"
                style={{marginBottom: 10}}
            />
            <ProForm formRef={formRef} onFinish={wrapSet} request={wrapGet} autoFocus={false} submitter={{
                resetButtonProps: {
                    style: {display: 'none'}
                }
            }}>
                <ProFormSwitch name="reverse-proxy-server-enabled"
                               label={t('settings.rp.enabled')}
                               rules={[{required: true}]}
                               checkedChildren={t('general.enabled')}
                               unCheckedChildren={t('general.disabled')}
                               fieldProps={{
                                   checked: enabled,
                                   onChange: setEnabled,
                               }}
                />

                <div className={'flex flex-col gap-2'}>
                    <div className={'p-6 pb-0 border rounded-md'}>
                        <Row gutter={16}>
                            <Col span={2}>
                                <ProFormCheckbox
                                    name="reverse-proxy-server-http-enabled"
                                    label="HTTP "
                                    disabled={!enabled}
                                >
                                    {t('general.enabled')}
                                </ProFormCheckbox>
                            </Col>
                            <Col span={6}>
                                <ProFormText name="reverse-proxy-server-http-addr" label={t('settings.rp.addr')}
                                             placeholder="0.0.0.0:80"
                                             rules={[{required: enabled}]}
                                             disabled={!enabled}/>
                            </Col>
                            <Col>
                                <ProFormDependency name={['reverse-proxy-server-http-enabled']}>
                                    {
                                        (values, form) => {
                                            let http = values['reverse-proxy-server-http-enabled'];
                                            if (http) {
                                                return <ProFormCheckbox
                                                    name="reverse-proxy-server-http-redirect-to-https"
                                                    label={t('settings.rp.redirect_to_https')}
                                                    disabled={!enabled}
                                                />;
                                            }
                                            return undefined;
                                        }
                                    }
                                </ProFormDependency>
                            </Col>
                        </Row>
                    </div>

                    <div className={'p-6 pb-0 border rounded-md'}>
                        <Row gutter={16}>
                            <Col span={2}>
                                <ProFormCheckbox
                                    name="reverse-proxy-server-https-enabled"
                                    label="HTTPS"
                                    disabled={!enabled}
                                    fieldProps={{
                                        onChange: (e) => {
                                            let addr = ':80'
                                            let checked = e.target.checked;
                                            if (checked) {
                                                addr = ':443'
                                            }
                                            formRef.current.setFieldsValue({
                                                'reverse-proxy-server-listen-addr': addr,
                                            })
                                        }
                                    }}
                                >
                                    {t('general.enabled')}
                                </ProFormCheckbox>
                            </Col>
                            <Col span={6}>
                                <ProFormText name="reverse-proxy-server-https-addr" label={t('settings.rp.addr')}
                                             placeholder="0.0.0.0:443"
                                             rules={[{required: enabled}]}
                                             disabled={!enabled}/>
                            </Col>
                        </Row>
                    </div>

                    <div className={'p-6 border rounded-md'}>
                        <Row gutter={16}>
                            <Col span={3}>
                                <ProFormCheckbox
                                    name="reverse-proxy-server-self-proxy-enabled"
                                    label={t('settings.rp.self_proxy')}
                                    disabled={!enabled}
                                >
                                    {t('general.enabled')}
                                </ProFormCheckbox>
                            </Col>
                            <Col>
                                <ProFormDependency name={['reverse-proxy-server-self-proxy-enabled']}>
                                    {(values) => {
                                        if (values['reverse-proxy-server-self-proxy-enabled']) {
                                            return <ProFormText name="reverse-proxy-server-self-domain"
                                                                label={t('settings.rp.domain')}
                                                                placeholder="example.com"
                                                                rules={[{required: enabled}]}
                                                                disabled={!enabled}/>
                                        } else {
                                            return <ProFormText name="system-root"
                                                                label={t('settings.rp.system_root')}
                                                                placeholder={getRootPath()}
                                                                rules={[{required: enabled}]}
                                                                disabled={!enabled}
                                                                extra={t('settings.rp.system_root_extra')}
                                            />
                                        }
                                    }}
                                </ProFormDependency>
                            </Col>
                        </Row>
                    </div>

                    {/*<div className={'p-6 border rounded-md'}>*/}
                    {/*    Custom Header*/}

                    {/*</div>*/}

                    <div className={'p-6 border rounded-md flex items-center gap-2'}>
                        <ProFormSelect
                            name="reverse-proxy-server-ip-extractor"
                            label={t('settings.system.ip.extractor')}
                            rules={[{required: true}]}
                            options={[
                                {label: t('settings.system.ip.extractor_direct'), value: 'direct'},
                                {label: 'Header(X-Real-IP)', value: 'x-real-ip'},
                                {label: 'Header(X-Forwarded-For)', value: 'x-forwarded-for'},
                            ]}
                            width={'sm'}
                        />

                        <ProFormDependency name={['reverse-proxy-server-ip-extractor']}>
                            {(record) => {
                                if (record['reverse-proxy-server-ip-extractor'] === 'direct') {
                                    return <></>;
                                }
                                return <div className={'flex-grow'}>
                                    <ProFormSelect name="reverse-proxy-server-ip-trust-list"
                                                   label={t('settings.system.ip.trust_list')}
                                                   placeholder={t('settings.system.ip.trust_placeholder')}
                                                   fieldProps={{
                                                       mode: 'tags',
                                                       value: ipTrustList,
                                                       onChange: setIpTrustList,
                                                   }}
                                                   style={{width: '100%'}}
                                    />
                                </div>
                            }}
                        </ProFormDependency>
                    </div>

                    <div className={'mb-6'}></div>

                </div>

            </ProForm>
        </div>
    );
};

export default ReverseProxySetting;