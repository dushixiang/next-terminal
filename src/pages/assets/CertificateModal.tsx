import React, {useEffect, useRef, useState} from 'react';
import {Modal} from "antd";
import {
    ProForm,
    ProFormDependency,
    ProFormInstance,
    ProFormRadio,
    ProFormText,
    ProFormTextArea
} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import certificateApi from "@/src/api/certificate-api";
import strings from "@/src/utils/strings";

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

    const formRef = useRef<ProFormInstance>();
    let {t} = useTranslation();

    const get = async () => {
        if (id) {
            return await api.getById(id);
        }
        return {
            type: 'self-signed'
        };
    }

    return (
        <Modal
            title={id ? t('actions.edit') : t('actions.new')}
            open={open}
            maskClosable={false}
            destroyOnClose={true}
            onOk={() => {
                formRef.current?.validateFields()
                    .then(async values => {
                        handleOk(values);
                    });
            }}
            onCancel={() => {
                formRef.current?.resetFields();
                handleCancel();
            }}
            confirmLoading={confirmLoading}
        >
            <ProForm formRef={formRef} request={get} submitter={false}>
                <ProFormText hidden={true} name={'id'}/>
                <ProFormText name={'commonName'} label={t('assets.certificates.common_name')}
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
                            case 'imported':
                                return <>
                                    <ProFormTextArea label={t("assets.certificates.certificate")}
                                                     name='certificate'
                                                     fieldProps={{rows: 4, allowClear: true}}
                                                     rules={[{required: true}]}
                                    />
                                    <ProFormTextArea label={t("assets.certificates.private_key")}
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
