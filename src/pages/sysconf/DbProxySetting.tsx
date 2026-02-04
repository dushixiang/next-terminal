import React, {useRef, useState} from 'react';
import {Alert, Typography} from "antd";
import {SettingProps} from "./SettingPage";
import {ProForm, ProFormInstance, ProFormSelect, ProFormSwitch, ProFormText} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";

const {Title, Paragraph} = Typography;

const DbProxySetting = ({get, set}: SettingProps) => {
    const {t} = useTranslation();
    const formRef = useRef<ProFormInstance>(null);
    const [enabled, setEnabled] = useState(false);

    const wrapSet = async (values: any) => {
        formRef.current?.validateFields()
            .then(() => {
                set(values);
            });
    };

    const wrapGet = async () => {
        const values = await get();
        setEnabled(values['db-proxy-enabled']);
        return values;
    };

    return (
        <div>
            <Title level={5} style={{marginTop: 0}}>{t('db.proxy.setting')}</Title>
            <Alert
                message={t('db.proxy.tip')}
                type="info"
                style={{marginBottom: 10}}
            />

            <div className={'space-y-1 mb-4 border rounded-lg p-4'}>
                <div className={'font-medium'}>{t('db.proxy.usage_title')}</div>
                <div className={'flex items-center gap-2'}>
                    <div>{t('db.proxy.usage_client')}</div>
                    <div><Paragraph style={{marginBottom: 0}} copyable={true}>mysql -h host -P port -u username@asset_name -p</Paragraph></div>
                </div>
                <div className={'flex items-center gap-2'}>
                    <div>{t('db.proxy.password_label')}</div>
                    <div>
                        <Paragraph style={{marginBottom: 0}}>
                            {t('db.proxy.password_tip_prefix')}
                            <Link to={'/info?activeKey=access-token'}>{t('db.proxy.password_tip_link')}</Link>
                            {t('db.proxy.password_tip_suffix')}
                        </Paragraph>
                    </div>
                </div>
            </div>

            <ProForm formRef={formRef} onFinish={wrapSet} request={wrapGet}
                     submitter={{
                         resetButtonProps: {style: {display: 'none'}}
                     }}
            >
                <ProFormSwitch
                    name="db-proxy-enabled"
                    label={t('db.proxy.enabled')}
                    rules={[{required: true}]}
                    checkedChildren={t('general.enabled')}
                    unCheckedChildren={t('general.disabled')}
                    fieldProps={{
                        checked: enabled,
                        onChange: setEnabled,
                    }}
                />
                <ProFormText
                    name="db-proxy-addr"
                    label={t('settings.sshd.addr')}
                    placeholder="0.0.0.0:3307"
                    rules={[{required: enabled}]}
                    disabled={!enabled}
                />
                <ProFormSwitch
                    name="db-proxy-block-dml"
                    label={t('db.proxy.block_dml')}
                    tooltip={t('db.proxy.block_dml_tip')}
                    checkedChildren={t('general.yes')}
                    unCheckedChildren={t('general.no')}
                />
                <ProFormSelect
                    name="db-sql-log-saved-limit-days"
                    label={t('db.sql_log.saved_limit_days')}
                    fieldProps={{
                        options: [
                            {value: '', label: '♾️'},
                            {value: '7', label: '7'},
                            {value: '15', label: '15'},
                            {value: '30', label: '30'},
                            {value: '60', label: '60'},
                            {value: '180', label: '180'},
                        ]
                    }}
                    addonAfter={t('general.days')}
                />
            </ProForm>
        </div>
    );
};

export default DbProxySetting;
