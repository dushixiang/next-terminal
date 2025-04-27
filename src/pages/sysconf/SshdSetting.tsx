import React, {useRef, useState} from 'react';
import {Alert, Button, Typography} from "antd";
import {SettingProps} from "./SettingPage";
import {ProForm, ProFormInstance, ProFormSwitch, ProFormText, ProFormTextArea} from "@ant-design/pro-components";
import {useMutation} from "@tanstack/react-query";
import propertyApi from "../../api/property-api";
import {useTranslation} from "react-i18next";

const {Title, Paragraph} = Typography;

const SshdSetting = ({get, set}: SettingProps) => {

    let {t} = useTranslation();
    const formRef = useRef<ProFormInstance>();
    let [enabled, setEnabled] = useState(false);
    let [portForwardEnabled, setPortForwardEnabled] = useState(false);

    const wrapSet = async (values: any) => {
        formRef.current?.validateFields()
            .then(() => {
                set(values);
            })
    }

    const wrapGet = async () => {
        let values = await get();
        setEnabled(values['ssh-server-enabled']);
        setPortForwardEnabled(values['ssh-server-port-forwarding-enabled']);
        return values;
    }

    let mutation = useMutation({
        mutationFn: propertyApi.genRSAPrivateKey,
        onSuccess: data => {
            formRef.current?.setFieldsValue({
                'ssh-server-private-key': data
            })
        }
    });

    return (
        <div>
            <Title level={5} style={{marginTop: 0}}>{t('settings.sshd.setting')}</Title>
            <Alert
                message={t('settings.sshd.tip')}
                type="info"
                style={{marginBottom: 10}}
            />

            <div className={'space-y-1 mb-4 border rounded-lg p-4'}>
                <div className={'font-medium'}>{t('settings.sshd.usage')}</div>
                <div className={'flex items-center gap-2'}>
                    <div>{t('settings.sshd.mode_proxy')}</div>
                    <div><Paragraph style={{marginBottom:0}} copyable={true}>ssh username@host -p port</Paragraph></div>
                </div>
                <div className={'flex items-center gap-2'}>
                    <div>{t('settings.sshd.direct_proxy')}</div>
                    <div><Paragraph style={{marginBottom:0}} copyable={true}>ssh username:asset-name@host -p port</Paragraph></div>
                </div>
            </div>

            <ProForm formRef={formRef} onFinish={wrapSet} request={wrapGet}
                     submitter={{
                         submitButtonProps: {
                             onReset: () => {
                                 mutation.mutate();
                             }
                         },
                         render: (props, doms) => {
                             return [
                                 doms[1],
                                 <Button htmlType="button" onClick={() => mutation.mutate()} key="gen"
                                         loading={mutation.isPending}>
                                     {t('settings.sshd.generate_private_key')}
                                 </Button>,
                             ]
                         }
                     }}
            >
                <ProFormSwitch name="ssh-server-enabled"
                               label={t("settings.sshd.enabled")}
                               rules={[{required: true}]}
                               checkedChildren={t('general.enabled')}
                               unCheckedChildren={t('general.disabled')}
                               fieldProps={{
                                   checked: enabled,
                                   onChange: setEnabled,
                               }}
                />
                <ProFormText name="ssh-server-addr"
                             label={t('settings.sshd.addr')}
                             placeholder="0.0.0.0:2022"
                             rules={[{required: enabled}]}
                             disabled={!enabled}/>
                <ProFormTextArea name="ssh-server-private-key"
                                 label={t('settings.sshd.private_key')}
                                 rules={[{required: enabled}]}
                                 disabled={!enabled}
                                 placeholder={'RSA、EC、DSA、OPENSSH'} fieldProps={{rows: 8}}
                />
                <ProFormSwitch name="ssh-server-port-forwarding-enabled"
                               label={t("settings.sshd.port_forwarding.enabled")}
                               checkedChildren={t('general.enabled')}
                               unCheckedChildren={t('general.disabled')}
                               fieldProps={{
                                   checked: portForwardEnabled,
                                   onChange: setPortForwardEnabled,
                               }}
                />
                <ProFormTextArea name="ssh-server-port-forwarding-host-port"
                                 label={t('settings.sshd.port_forwarding.host_port')}
                                 rules={[{required: portForwardEnabled}]}
                                 disabled={!portForwardEnabled}
                                 placeholder={'172.16.0.1:3306,10.10.0.3:5432'} fieldProps={{rows: 4}}
                />
                <ProFormSwitch name="ssh-server-disable-password-auth"
                               label={t("settings.sshd.disable_password_auth")}
                               checkedChildren={t('general.yes')}
                               unCheckedChildren={t('general.no')}
                />
            </ProForm>
        </div>
    );
};

export default SshdSetting;