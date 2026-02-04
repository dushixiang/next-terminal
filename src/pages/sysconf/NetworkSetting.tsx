import React, {useEffect, useState} from 'react';
import {ProForm, ProFormDependency, ProFormSelect} from "@ant-design/pro-components";
import {Col, Divider, Row, Tooltip} from "antd";
import {Info} from "lucide-react";
import {useTranslation} from "react-i18next";
import {SettingProps} from "@/pages/sysconf/SettingPage";
import propertyApi, {ClientIPs} from "@/api/property-api";

const NetworkSetting = ({get, set}: SettingProps) => {
    let {t} = useTranslation();
    let [ipTrustList, setIpTrustList] = useState<string[]>([]);
    let [clientIPs, setClientIPs] = useState<ClientIPs | null>(null);

    useEffect(() => {
        // 获取客户端 IP 信息
        propertyApi.getClientIPs().then(ips => {
            setClientIPs(ips);
        }).catch(err => {
            console.error('Failed to get client IPs:', err);
        });
    }, []);

    const wrapGet = async () => {
        let values = await get();
        if (values['ip-trust-list']) {
            let parts = values['ip-trust-list'].split(',');
            setIpTrustList(parts);
        }
        return values;
    }

    const wrapSet = (values: any) => {
        values['ip-trust-list'] = ipTrustList.join(',');
        return set(values);
    }

    return (
        <div>
            <ProForm
                onFinish={wrapSet}
                request={wrapGet}
                submitter={{
                    resetButtonProps: {
                        style: {display: 'none'}
                    }
                }}
            >
                <Divider orientation="left">{t('settings.network.setting')}</Divider>
                <ProFormSelect
                    name="ip-extractor"
                    label={t('settings.system.ip.extractor')}
                    rules={[{required: true}]}
                    options={[
                        {
                            label: `${t('assets.addr')}${clientIPs?.direct ? ` (${clientIPs.direct})` : ''}`,
                            value: 'direct'
                        },
                        {
                            label: `Header(X-Real-IP)${clientIPs?.['x-real-ip'] ? ` (${clientIPs['x-real-ip']})` : ` (${t('settings.network.not_detected')})`}`,
                            value: 'x-real-ip'
                        },
                        {
                            label: `Header(X-Forwarded-For)${clientIPs?.['x-forwarded-for'] ? ` (${clientIPs['x-forwarded-for']})` : ` (${t('settings.network.not_detected')})`}`,
                            value: 'x-forwarded-for'
                        },
                    ]}
                />

                <ProFormDependency name={['ip-extractor']}>
                    {(record) => {
                        if (record['ip-extractor'] === 'direct') {
                            return null;
                        }
                        return (
                            <Row gutter={[16, 16]}>
                                <Col xs={24}>
                                    <ProFormSelect
                                        name="ip-trust-list"
                                        label={
                                            <div className="flex items-center gap-1">
                                                {t('settings.system.ip.trust_list')}
                                                <Tooltip title={t('settings.network.trust_ip_tip')}>
                                                    <Info className="text-gray-400" size={12}/>
                                                </Tooltip>
                                            </div>
                                        }
                                        placeholder={t('settings.system.ip.trust_placeholder')}
                                        fieldProps={{
                                            mode: 'tags',
                                            value: ipTrustList,
                                            onChange: setIpTrustList,
                                        }}
                                    />
                                </Col>
                            </Row>
                        );
                    }}
                </ProFormDependency>
            </ProForm>
        </div>
    );
};

export default NetworkSetting;
