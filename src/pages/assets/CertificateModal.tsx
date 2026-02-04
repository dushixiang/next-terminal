import React, {useRef} from 'react';
import {Modal} from "antd";
import {
    ProForm,
    ProFormDependency,
    ProFormDigit,
    ProFormInstance,
    ProFormRadio,
    ProFormSwitch,
    ProFormText,
    ProFormTextArea
} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import certificateApi from "@/api/certificate-api";
import strings from "@/utils/strings";

const api = certificateApi;

export interface CertificateProps {
    open: boolean
    handleOk: (values: any) => void
    handleCancel: () => void
    confirmLoading: boolean
    id: string | undefined
}

const CertificateModal = ({
                              open,
                              handleOk,
                              handleCancel,
                              confirmLoading,
                              id,
                          }: CertificateProps) => {

    const formRef = useRef<ProFormInstance>(null);
    let {t} = useTranslation();

    const get = async () => {
        if (id) {
            return await api.getById(id);
        }
        return {
            type: 'self-signed',
            renewBefore: 30,
            requireClientAuth: false,
        };
    }

    return (
        <Modal
            title={id ? t('actions.edit') : t('actions.new')}
            open={open}
            maskClosable={false}
            destroyOnHidden={true}
            onOk={() => {
                formRef.current?.validateFields()
                    .then(async values => {
                        handleOk(values);
                    });
            }}
            onCancel={() => {
                
                handleCancel();
            }}
            confirmLoading={confirmLoading}
        >
            <ProForm formRef={formRef} request={get} submitter={false}>
                <ProFormText hidden={true} name={'id'}/>
                <ProFormText name={'commonName'} label={t('assets.domain')}
                             rules={[{required: true}]}
                             disabled={strings.hasText(id)}
                />
                <ProFormRadio.Group
                    label={t('assets.certificates.type')} name='type' rules={[{required: true}]}
                    options={[
                        {label: t('assets.certificates.self_signed'), value: 'self-signed'},
                        {label: t('assets.certificates.issued'), value: 'issued'},
                        {label: t('assets.certificates.imported'), value: 'imported'},
                    ]}
                    disabled={strings.hasText(id)}
                />
                <ProFormDependency name={['type']}>
                    {({type}) => {
                        switch (type) {
                            case 'self-signed':
                                return <>
                                    <div className={'p-4 border rounded-lg space-y-1 mb-4'}>
                                        <div className={'font-medium'}>{t('assets.certificates.self_signed_tip_title')}</div>
                                        <div>{t('assets.certificates.self_signed_root_ca_cert_path')} ./data/root_ca_cert.pem</div>
                                        <div>{t('assets.certificates.self_signed_root_ca_key_path')} ./data/root_ca_key.pem</div>
                                    </div>
                                    <ProFormSwitch
                                        name="requireClientAuth"
                                        label={t('assets.certificates.require_client_auth')}
                                    />
                                </>
                            case 'issued':
                                return <>
                                    <ProFormDigit label={t("assets.certificates.renew_before")}
                                                  name='renewBefore'
                                                  rules={[{required: true}]}
                                                  fieldProps={{
                                                      addonAfter: t('general.days'),
                                                      min: 0,
                                                      max: 3650,
                                                      step: 1,
                                                  }}
                                    />
                                </>
                            case 'imported':
                                return <>
                                    <ProFormTextArea label={t("assets.cert")}
                                                     name='certificate'
                                                     fieldProps={{rows: 4, allowClear: true}}
                                                     rules={[{required: true}]}
                                    />
                                    <ProFormTextArea label={t("assets.private_key")}
                                                     name='privateKey'
                                                     fieldProps={{rows: 4, allowClear: true}}
                                                     rules={[{required: true}]}
                                    />
                                </>;
                        }
                    }}
                </ProFormDependency>
            </ProForm>
        </Modal>
    )
};

export default CertificateModal;
