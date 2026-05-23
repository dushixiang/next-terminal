import QuerySelect from "@/components/QuerySelect";
import React from 'react';
import {Button, Form, FormInstance, Input, Space} from 'antd';
import {EyeInvisibleOutlined, EyeTwoTone} from '@ant-design/icons';
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
    form?: FormInstance;
}

const AccountTypeForm: React.FC<AccountTypeFormProps> = ({
                                                             accountType,
                                                             protocol,
                                                             assetId,
                                                             copy,
                                                             decrypted,
                                                             setDecrypted,
                                                             setMfaOpen,
                                                             form
                                                         }) => {
    const {t} = useTranslation();
    if (accountType === 'credential') {
        return <Form.Item label={t('menus.resource.submenus.credential')} name='credentialId' rules={[{
            required: true
        }]}>
            <QuerySelect showSearch request={async () => {
                let credentials = await credentialApi.getAll();
                return credentials.map(item => ({
                    label: item.name,
                    value: item.id
                }));
            }}/>
        </Form.Item>;
    }
    switch (accountType) {
        case 'password':
            return <Space>
                <Form.Item label={t('menus.identity.submenus.user')} name='username'>
                    <Input autoComplete={'off'}/>
                </Form.Item>
                <Form.Item label={t('assets.password')} name='password'>
                    <Input.Password
                        autoComplete='new-password'
                        iconRender={visible => visible ? <EyeTwoTone/> : <EyeInvisibleOutlined/>}
                        visibilityToggle={{
                            onVisibleChange: visible => {
                                if (assetId && !copy && visible && !decrypted) {
                                    setMfaOpen(true);
                                }
                            }
                        }}
                        onChange={e => {
                            let val = e.target.value;
                            if (val.startsWith("******")) {
                                val = val.substring(6);
                                form?.setFieldValue('password', val);
                                setDecrypted(true);
                            }
                        }}
                    />
                </Form.Item>
            </Space>;
        case 'private-key':
            return <>
                <Form.Item label={t('menus.identity.submenus.user')} name='username' required={true}>
                    <Input autoComplete='off' />
                </Form.Item>
                <Form.Item label={t('assets.private_key')} name='privateKey' required={true}>
                    <Input.TextArea
                        rows={4}
                        allowClear={true}
                        autoComplete='off'
                    />
                </Form.Item>
                <Form.Item label={null}>
                    <div className={'-mt-2'}>
                        <Button color={'purple'} variant={'filled'} onClick={async () => {
                            setMfaOpen(true);
                        }}>
                            {t('actions.view_private_key')}
                        </Button>
                    </div>
                </Form.Item>
                <Form.Item label={t('assets.passphrase')} name='passphrase'>
                    <Input.Password autoComplete='new-password' />
                </Form.Item>
            </>;
        default:
            return null;
    }
};
export default AccountTypeForm;
