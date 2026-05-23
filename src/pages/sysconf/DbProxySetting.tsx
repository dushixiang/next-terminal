import {useFormRequest} from "@/hook/use-antd-form-query";
import React, {useRef, useState} from 'react';
import {Alert, Button, Form, FormInstance, Input, Select, Space, Switch, Typography} from 'antd';
import {SettingProps} from "./SettingPage";
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";

const {
    Title,
    Paragraph
} = Typography;
const parseHostAndPort = (addr?: string) => {
    if (!addr) {
        return {
            host: '',
            port: ''
        };
    }
    const value = addr.trim();
    const sep = value.lastIndexOf(':');
    if (sep <= 0 || sep === value.length - 1) {
        return {
            host: value,
            port: ''
        };
    }
    return {
        host: value.substring(0, sep),
        port: value.substring(sep + 1)
    };
};
const DbProxySetting = ({
                            get,
                            set
                        }: SettingProps) => {
    const {t} = useTranslation();
    const formRef = useRef<FormInstance>(null);
    const [enabled, setEnabled] = useState(false);
    const wrapSet = async (values: any) => {
        formRef.current?.validateFields().then(() => {
            set(values);
        });
    };
    const wrapGet = async () => {
        const values = await get();
        setEnabled(values['db-proxy-enabled']);
        const externalHost = values['db-proxy-external-host'];
        const externalPort = values['db-proxy-external-port'];
        const sqlLogSavedLimitDays = values['db-sql-log-saved-limit-days'];
        const parsed = parseHostAndPort(values['db-proxy-addr']);
        return {
            ...values,
            'db-proxy-external-host': externalHost || parsed.host,
            'db-proxy-external-port': externalPort || parsed.port,
            'db-sql-log-saved-limit-days': sqlLogSavedLimitDays == null ? '' : `${sqlLogSavedLimitDays}`
        };
    };
    useFormRequest(formRef, ["form-request", "web/src/pages/sysconf/DbProxySetting.tsx"], wrapGet, true);
    return <div>
        <Title level={5} style={{
            marginTop: 0
        }}>{t('db.proxy.setting')}</Title>
        <Alert title={t('db.proxy.tip')} type="info" style={{
            marginBottom: 10
        }}/>

        <div className={'space-y-1 mb-4 border rounded-lg p-4'}>
            <div className={'font-medium'}>{t('db.proxy.usage_title')}</div>
            <div className={'flex items-center gap-2'}>
                <div>{t('db.proxy.usage_client')}</div>
                <div><Paragraph style={{
                    marginBottom: 0
                }} copyable={true}>mysql -h host -P port -u username@asset_name -p</Paragraph></div>
            </div>
            <div className={'flex items-center gap-2'}>
                <div>{t('account.access_token_type_values.db_password')}</div>
                <div>
                    <Paragraph style={{
                        marginBottom: 0
                    }}>
                        {t('db.proxy.password_tip_prefix')}
                        <Link to={'/info?activeKey=access-token'}>{t('db.proxy.password_tip_link')}</Link>
                        {t('db.proxy.password_tip_suffix')}
                    </Paragraph>
                </div>
            </div>
        </div>

        <Form onFinish={wrapSet} ref={formRef} layout="vertical">
            <Form.Item name="db-proxy-enabled" label={t('db.proxy.enabled')} rules={[{
                required: true
            }]} valuePropName="checked">
                <Switch checked={enabled} onChange={setEnabled} checkedChildren={t('general.enabled')}
                        unCheckedChildren={t('general.disabled')}/>
            </Form.Item>
            <Form.Item name="db-proxy-addr" label={t('settings.sshd.addr')} rules={[{
                required: enabled
            }]}>
                <Input disabled={!enabled} placeholder="0.0.0.0:3307"/>
            </Form.Item>
            <Space>
                <Form.Item name="db-proxy-external-host"
                           label={`${t('gateways.monitor.external')} ${t('db.asset.host')}`}>
                    <Input disabled={!enabled} placeholder="db.example.com"/>
                </Form.Item>
                <Form.Item name="db-proxy-external-port"
                           label={`${t('gateways.monitor.external')} ${t('gateways.port')}`}>
                    <Input type="number" disabled={!enabled} placeholder="3307"/>
                </Form.Item>
            </Space>
            <Alert showIcon type="warning" title={t('db.proxy.external_quick_access_tip')} style={{
                marginBottom: 8
            }}/>
            <Form.Item name="db-proxy-block-dml" label={t('db.proxy.block_dml')} tooltip={t('db.proxy.block_dml_tip')}
                       valuePropName="checked">
                <Switch checkedChildren={t('general.yes')} unCheckedChildren={t('general.no')}/>
            </Form.Item>
            <Form.Item label={t('db.sql_log.saved_limit_days')}>
                <Space.Compact>
                    <Form.Item name="db-sql-log-saved-limit-days" noStyle>
                        <Select
                            options={[{
                                value: '',
                                label: '♾️'
                            }, {
                                value: '7',
                                label: '7'
                            }, {
                                value: '15',
                                label: '15'
                            }, {
                                value: '30',
                                label: '30'
                            }, {
                                value: '60',
                                label: '60'
                            }, {
                                value: '180',
                                label: '180'
                            }]}
                            style={{
                                width: 100,
                            }}
                        />
                    </Form.Item>
                    <Space.Addon>{t('general.days')}</Space.Addon>
                </Space.Compact>
            </Form.Item>

            <Form.Item>
                <Button type="primary" htmlType="submit">{t("actions.save")}</Button>
            </Form.Item>
        </Form>
    </div>;
};
export default DbProxySetting;
