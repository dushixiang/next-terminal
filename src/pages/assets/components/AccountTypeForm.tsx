import React, {useRef, useState} from 'react';
import {Button, Form} from "antd";
import {EyeInvisibleOutlined, EyeTwoTone} from '@ant-design/icons';
import {ProFormInstance, ProFormSelect, ProFormText, ProFormTextArea} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import credentialApi from "../../../api/credential-api";

interface AccountTypeFormProps {
    accountType: string;
    protocol: string;
    assetId?: string;
    copy?: boolean;
    decrypted: boolean;
    setDecrypted: (value: boolean) => void;
    setMfaOpen: (value: boolean) => void;
    formRef?: React.RefObject<ProFormInstance>;
}

const AccountTypeForm: React.FC<AccountTypeFormProps> = ({
    accountType,
    protocol, 
    assetId,
    copy,
    decrypted,
    setDecrypted,
    setMfaOpen,
    formRef
}) => {
    const {t} = useTranslation();

    if (accountType === 'credential') {
        return (
            <ProFormSelect
                label={t('menus.resource.submenus.credential')} 
                name='credentialId'
                rules={[{required: true}]}
                request={async () => {
                    let credentials = await credentialApi.getAll();
                    return credentials.map(item => ({
                        label: item.name,
                        value: item.id,
                    }));
                }}
                showSearch
            />
        );
    }

    switch (accountType) {
        case 'password':
            return (
                <>
                    <ProFormText label={t('menus.identity.submenus.user')} name='username'/>
                    <ProFormText.Password 
                        label={t('assets.password')}
                        name='password'
                        fieldProps={{
                            iconRender: (visible) => (visible ? <EyeTwoTone/> : <EyeInvisibleOutlined/>),
                            visibilityToggle: {
                                onVisibleChange: (visible) => {
                                    if (assetId && !copy && visible && !decrypted) {
                                        setMfaOpen(true)
                                    }
                                }
                            },
                            onChange: (e) => {
                                let val = e.target.value;
                                if (val.startsWith("******")) {
                                    val = val.substring(6);
                                    formRef?.current?.setFieldValue('password', val);
                                    setDecrypted(true);
                                }
                            }
                        }}
                    />
                </>
            );

        case 'private-key':
            return (
                <>
                    <ProFormText 
                        label={t('menus.identity.submenus.user')} 
                        name='username' 
                        rules={[{required: true}]}
                    />
                    <ProFormTextArea 
                        label={t('assets.private_key')}
                        name='privateKey'
                        rules={[{required: true}]}
                        fieldProps={{
                            rows: 4,
                            allowClear: true,
                        }}
                    />
                    <Form.Item label={null}>
                        <div className={'-mt-2'}>
                            <Button 
                                color={'purple'}
                                variant={'filled'}
                                onClick={async () => {
                                    setMfaOpen(true)
                                }}
                            >
                                {t('actions.view_private_key')}
                            </Button>
                        </div>
                    </Form.Item>
                    <ProFormText.Password 
                        label={t('assets.passphrase')} 
                        name='passphrase'
                    />
                </>
            );

        default:
            return null;
    }
};

export default AccountTypeForm;
