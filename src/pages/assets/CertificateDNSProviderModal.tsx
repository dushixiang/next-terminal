import React, {useRef, useState} from 'react';
import {App, Modal} from "antd";
import {ProForm, ProFormDependency, ProFormInstance, ProFormRadio, ProFormText} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import dnsProviderApi from "@/api/dns-provider-api";

export interface Props {
    open: boolean
    handleOk: (values: any) => void
    handleCancel: () => void
}

const CertificateDNSProviderModal = ({
                                         open,
                                         handleOk,
                                         handleCancel,
                                     }: Props) => {

    const formRef = useRef<ProFormInstance>(null);
    let {t} = useTranslation();
    let [ok, setOk] = useState(false);
    let {modal,message} = App.useApp();

    const get = async () => {
        const data = await dnsProviderApi.get();
        if (data.ok === true) {
            setOk(true);
            return data;
        }
        return {
            type: 'tencentcloud'
        };
    }

    return (
        <Modal
            title={t('assets.dns_provider_config')}
            open={open}
            maskClosable={false}
            destroyOnHidden={true}
            onOk={() => {
                formRef.current?.validateFields()
                    .then(async values => {
                        handleOk(values);
                    });
            }}
            onCancel={handleCancel}
            confirmLoading={false}
            okText={t('assets.dns_providers.set')}
            okButtonProps={{
                disabled: ok,
            }}
            cancelButtonProps={{
                color: 'red',
                variant: 'filled',
                disabled: !ok,
                onClick: async () => {
                    modal.confirm({
                        title: t('assets.dns_providers.remove_confirm_title'),
                        content: t('assets.dns_providers.remove_confirm_content'),
                        onOk: () => {
                            dnsProviderApi.remove().then(() => {
                                formRef.current?.setFieldsValue({
                                    type: 'tencentcloud',
                                    tencentcloud: {
                                        secretId: '',
                                        secretKey: '',
                                    },
                                    alidns: {
                                        accessKeyId: '',
                                        accessKeySecret: '',
                                    },
                                    cloudflare: {
                                        apiToken: '',
                                        zoneToken: '',
                                    },
                                    huaweicloud: {
                                        accessKeyId: '',
                                        secretAccessKey: '',
                                    }
                                })
                                setOk(false);
                                message.open({
                                    type: 'success',
                                    content: t('general.success'),
                                })
                            })
                        },
                    })
                }
            }}
            cancelText={t('assets.dns_providers.remove')}
        >
            <ProForm formRef={formRef} request={get} submitter={false} disabled={ok}>
                <ProFormText hidden={true} name={'id'}/>
                <ProFormRadio.Group
                    label={t('assets.dns_providers.type')} name='type' rules={[{required: true}]}
                    options={[
                        {label: t('assets.dns_providers.tencentcloud'), value: 'tencentcloud'},
                        {label: t('assets.dns_providers.alidns'), value: 'alidns'},
                        {label: t('assets.dns_providers.huaweicloud'), value: 'huaweicloud'},
                        {label: t('assets.dns_providers.cloudflare'), value: 'cloudflare'},
                    ]}
                />
                <ProFormDependency name={['type']}>
                    {({type}) => {
                        switch (type) {
                            case 'tencentcloud':
                                return <>
                                    <ProFormText label={'SecretId'} name={['tencentcloud', 'secretId']}/>
                                    <ProFormText label={'SecretKey'} name={['tencentcloud', 'secretKey']}/>
                                </>;
                            case 'alidns':
                                return <>
                                    <ProFormText label={'AccessKeyId'} name={['alidns', 'accessKeyId']}/>
                                    <ProFormText label={'AccessKeySecret'} name={['alidns', 'accessKeySecret']}/>
                                </>;
                            case 'huaweicloud':
                                return <>
                                    <ProFormText label={'AccessKeyId'} name={['huaweicloud', 'accessKeyId']}/>
                                    <ProFormText label={'SecretAccessKey'} name={['huaweicloud', 'secretAccessKey']}/>
                                </>;
                            case 'cloudflare':
                                return <>
                                    <ProFormText label={'ApiToken'} name={['cloudflare', 'apiToken']}/>
                                    <ProFormText label={'ZoneToken'} name={['cloudflare', 'zoneToken']}/>
                                </>;
                        }
                    }}
                </ProFormDependency>
            </ProForm>
        </Modal>
    )
};

export default CertificateDNSProviderModal;
