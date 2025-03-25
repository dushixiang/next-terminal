import {Button, Form, Input, InputNumber, Modal, Space} from 'antd';
import React, {useEffect, useRef, useState} from 'react';
import {
    ProForm,
    ProFormDependency,
    ProFormInstance,
    ProFormRadio,
    ProFormSelect,
    ProFormText,
    ProFormTextArea
} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import sshGatewayApi from "@/src/api/ssh-gateway-api";
import credentialApi from "@/src/api/credential-api";
import MultiFactorAuthentication from "@/src/pages/account/MultiFactorAuthentication";
import {EyeInvisibleOutlined, EyeTwoTone} from "@ant-design/icons";

const api = sshGatewayApi;

interface Props {
    open: boolean
    handleOk: (values: any) => void
    handleCancel: () => void
    confirmLoading: boolean
    id: string | undefined
}

const SshGatewayModal = ({
                             open,
                             handleOk,
                             handleCancel,
                             confirmLoading,
                             id,
                         }: Props) => {

    const formRef = useRef<ProFormInstance>();
    let {t} = useTranslation();

    let [decrypted, setDecrypted] = useState(false);
    let [mfaOpen, setMfaOpen] = useState(false);

    useEffect(() => {
        if (!open) {
            setDecrypted(false);
        }
    }, [open]);

    const get = async () => {
        if (id) {
            return await api.getById(id);
        }
        return {
            accountType: 'password',
            port: 22,
        };
    }

    const renderAccountType = (accountType: string) => {
        switch (accountType) {
            case 'credential':
                return <>
                    <ProFormSelect
                        label={t('assets.credential')} name='credentialId'
                        rules={[{required: true}]}
                        request={async () => {
                            let credentials = await credentialApi.getAll();
                            return credentials.map(item => {
                                return {
                                    label: item.name,
                                    value: item.id,
                                }
                            });
                        }}
                    />
                </>;
            case 'password':
                return <>
                    <ProFormText label={t('assets.username')} name='username' rules={[{required: true}]}/>
                    <ProFormText.Password label={t('assets.password')}
                                          name='password'
                                          rules={[{required: true}]}
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
            case 'private-key':
                return <>
                    <ProFormText label={t('assets.username')} name='username' rules={[{required: true}]}/>
                    <ProFormTextArea label={t('assets.private_key')}
                                     name='privateKey'
                                     rules={[{required: true}]}
                                     fieldProps={{rows: 4}}
                    />
                    {id &&
                        <div className={'mb-2 -mt-2'}>
                            <Button color={'purple'}
                                    variant={'filled'}
                                    onClick={async () => {
                                        setMfaOpen(true)
                                    }}
                            >
                                {t('actions.view_private_key')}
                            </Button>
                        </div>
                    }

                    <ProFormText.Password label={t('assets.passphrase')} name='passphrase'/>
                </>
        }
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
                <Form.Item label={t('assets.addr')} className={'nesting-form-item'} rules={[{required: true}]}>
                    <Space.Compact block>
                        <Form.Item noStyle name='ip'
                                   rules={[{required: true}]}>
                            <Input style={{width: '70%'}} placeholder="hostname or ip"/>
                        </Form.Item>

                        <Form.Item noStyle name='port' rules={[{required: true}]}>
                            <InputNumber style={{width: '30%'}} min={1} max={65535} placeholder='1-65535'/>
                        </Form.Item>
                    </Space.Compact>
                </Form.Item>

                <ProFormRadio.Group
                    label={t('assets.account_type')} name='accountType' rules={[{required: true}]}
                    options={[
                        {label: t('assets.password'), value: 'password'},
                        {label: t('assets.private_key'), value: 'private-key'},
                        // {label: t('credential'), value: 'credential'},
                    ]}
                />
                <ProFormDependency name={['accountType']}>
                    {
                        ({accountType}) => {
                            return renderAccountType(accountType)
                        }
                    }
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
    );
};

export default SshGatewayModal;