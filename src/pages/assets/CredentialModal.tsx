import {useFormRequest} from "@/hook/use-antd-form-query";
import {useEffect, useState} from 'react';
import {Button, Form, Input, Modal, Radio} from 'antd';
import {useTranslation} from "react-i18next";
import credentialApi from "../../api/credential-api";
import MultiFactorAuthentication from "@/pages/account/MultiFactorAuthentication";
import {EyeInvisibleOutlined, EyeTwoTone} from "@ant-design/icons";

const api = credentialApi;

interface CredentialProps {
    open: boolean;
    handleOk: (values: any) => void;
    handleCancel: () => void;
    confirmLoading: boolean;
    id: string | undefined;
}

const CredentialModal = ({
    open,
    handleOk,
    handleCancel,
    confirmLoading,
    id
}: CredentialProps) => {
    const [form] = Form.useForm();
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
    };
    useFormRequest(form, ["form-request", "web/src/pages/assets/CredentialModal.tsx", open, id], get, {enabled: open});
    return <Modal
        title={id ? t('actions.edit') : t('actions.new')}
        open={open}
        mask={{closable: false}}
        destroyOnHidden={true}
        onOk={() => {
            form.validateFields().then(async values => {
                handleOk(values);
            });
        }}
        onCancel={() => {
            handleCancel();
        }}
        confirmLoading={confirmLoading}
    >
        <Form form={form} clearOnDestroy={true} layout="vertical">
            <Form.Item hidden={true} name={'id'}>
                <Input />
            </Form.Item>
            <Form.Item name={'name'} label={t('general.name')} required={true}>
                <Input />
            </Form.Item>
            <Form.Item label={t('assets.type')} name='type' required={true}>
                <Radio.Group options={[{
                    label: t('assets.password'),
                    value: 'password'
                }, {
                    label: t('assets.private_key'),
                    value: 'private-key'
                }]} />
            </Form.Item>
            <Form.Item label={t('assets.username')} name='username' required={true}>
                <Input />
            </Form.Item>
            <Form.Item noStyle={true} shouldUpdate={true}>
                {form => {
                    const type = form.getFieldValue('type');
                    switch (type) {
                        case 'private-key':
                            return <>
                                <Form.Item label={t("assets.private_key")} name='privateKey'>
                                    <Input.TextArea
                                        rows={4}
                                        allowClear={true} />
                                </Form.Item>
                                <div className={'mb-4 -mt-2 flex items-center gap-2'}>
                                    <Button color={'geekblue'} variant={'filled'} onClick={async () => {
                                        form.setFieldsValue({
                                            privateKey: `${await api.genPrivateKey()}`
                                        });
                                    }}>
                                        {t('assets.generate_private_key')}
                                    </Button>
                                    {id && <Button color={'purple'} variant={'filled'} onClick={async () => {
                                        setMfaOpen(true);
                                    }}>
                                        {t('actions.view_private_key')}
                                    </Button>}
                                </div>
                                <Form.Item label={t('assets.passphrase')} name='passphrase'>
                                    <Input.Password
                                        iconRender={visible => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                                        visibilityToggle={{
                                            onVisibleChange: visible => {
                                                if (id && visible && !decrypted) {
                                                    setMfaOpen(true);
                                                }
                                            }
                                        }} />
                                </Form.Item>
                            </>;
                        case 'password':
                            return <>
                                <Form.Item label={t('assets.password')} name='password'>
                                    <Input.Password
                                        iconRender={visible => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                                        visibilityToggle={{
                                            onVisibleChange: visible => {
                                                if (id && visible && !decrypted) {
                                                    setMfaOpen(true);
                                                }
                                            }
                                        }} />
                                </Form.Item>
                            </>;
                    }
                    return null;
                }}
            </Form.Item>
        </Form>

        <MultiFactorAuthentication
            open={mfaOpen}
            handleOk={async securityToken => {
                if (!id) {
                    return;
                }
                const res = await api.decrypt(id, securityToken);
                form.setFieldsValue(res);
                setDecrypted(true);
                setMfaOpen(false);
            }}
            handleCancel={() => setMfaOpen(false)}
        />
    </Modal>;
};
export default CredentialModal;
