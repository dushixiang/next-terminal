import React, {useEffect, useRef, useState} from 'react';
import {Button, Modal} from "antd";
import {
    ProForm,
    ProFormDependency,
    ProFormInstance,
    ProFormRadio,
    ProFormText,
    ProFormTextArea
} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import credentialApi from "../../api/credential-api";
import MultiFactorAuthentication from "@/src/pages/account/MultiFactorAuthentication";
import {EyeInvisibleOutlined, EyeTwoTone} from "@ant-design/icons";

const api = credentialApi;

export interface CredentialProps {
    open: boolean
    handleOk: (values: any) => void
    handleCancel: () => void
    confirmLoading: boolean
    id: string | undefined
}

const CredentialModal = ({
                             open,
                             handleOk,
                             handleCancel,
                             confirmLoading,
                             id,
                         }: CredentialProps) => {

    const formRef = useRef<ProFormInstance>();
    let {t} = useTranslation();
    let [decrypted, setDecrypted] = useState(false);
    let [mfaOpen, setMfaOpen] = useState(false);

    useEffect(() => {
        if (!open) {
            setDecrypted(false);
            setMfaOpen(false);
        }
    }, [open]);

    const get = async () => {
        if (id) {
            return await api.getById(id);
        }
        return {
            type: 'password'
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
                        formRef.current?.resetFields();
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
                <ProFormText name={'name'} label={t('assets.name')} rules={[{required: true}]}/>
                <ProFormRadio.Group
                    label={t('assets.type')} name='type' rules={[{required: true}]}
                    options={[
                        {label: t('assets.password'), value: 'password'},
                        {label: t('assets.private_key'), value: 'private-key'},
                    ]}
                />
                <ProFormText label={t('assets.username')} name='username' rules={[{required: true}]}/>
                <ProFormDependency name={['type']}>
                    {({type}) => {
                        switch (type) {
                            case 'private-key':
                                return <>
                                    <ProFormTextArea label={t("assets.private_key")}
                                                     name='privateKey'
                                                     fieldProps={{rows: 4, allowClear: true}}
                                    />
                                    <div className={'mb-4 -mt-2 flex items-center gap-2'}>
                                        <Button color={'geekblue'}
                                                variant={'filled'}
                                                onClick={async () => {
                                                    formRef.current?.setFieldsValue({
                                                        privateKey: `${await api.genPrivateKey()}`
                                                    })
                                                }}
                                        >
                                            {t('assets.generate_private_key')}
                                        </Button>
                                        {id &&
                                            <Button color={'purple'}
                                                    variant={'filled'}
                                                    onClick={async () => {
                                                        setMfaOpen(true)
                                                    }}
                                            >
                                                {t('actions.view_private_key')}
                                            </Button>
                                        }
                                    </div>
                                    <ProFormText.Password label={t('assets.passphrase')} name='passphrase'/>
                                </>;
                            case 'password':
                                return <>
                                    <ProFormText.Password
                                        label={t('assets.password')}
                                        name='password'
                                        fieldProps={{
                                            iconRender: (visible) => (visible ? <EyeTwoTone/> :
                                                <EyeInvisibleOutlined/>),
                                            visibilityToggle: {
                                                // visible: !decrypted,
                                                onVisibleChange: (visible) => {
                                                    if (id && visible && !decrypted) {
                                                        setMfaOpen(true)
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                </>
                        }
                    }}
                </ProFormDependency>
            </ProForm>

            <MultiFactorAuthentication
                open={mfaOpen}
                handleOk={async (securityToken) => {
                    const res = await api.decrypt(id, securityToken);
                    formRef.current?.setFieldsValue(res);
                    setDecrypted(true);
                    setMfaOpen(false);
                }}
                handleCancel={() => setMfaOpen(false)}
            />
        </Modal>
    )
};

export default CredentialModal;
