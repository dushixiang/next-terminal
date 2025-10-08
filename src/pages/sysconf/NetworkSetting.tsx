import React, {useState} from 'react';
import {ProForm, ProFormDependency, ProFormSelect} from "@ant-design/pro-components";
import {Col, Divider, Row, Tooltip} from "antd";
import {Info} from "lucide-react";
import {useTranslation} from "react-i18next";
import {SettingProps} from "@/src/pages/sysconf/SettingPage";

const NetworkSetting = ({get, set}: SettingProps) => {
    let {t} = useTranslation();
    let [ipTrustList, setIpTrustList] = useState<string[]>([]);

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
                <Divider orientation="left">网络设置</Divider>
                <ProFormSelect
                    name="ip-extractor"
                    label={t('settings.system.ip.extractor')}
                    rules={[{required: true}]}
                    options={[
                        {label: t('settings.system.ip.extractor_direct'), value: 'direct'},
                        {label: 'Header(X-Real-IP)', value: 'x-real-ip'},
                        {label: 'Header(X-Forwarded-For)', value: 'x-forwarded-for'},
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
                                                <Tooltip title="配置可信任的代理服务器IP地址，支持CIDR格式">
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