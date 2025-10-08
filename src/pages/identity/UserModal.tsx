import React, {useRef} from 'react';
import {Col, Modal, Row} from "antd";
import roleApi from "../../api/role-api";
import userApi from "../../api/user-api";
import {
    ProForm,
    ProFormDependency,
    ProFormInstance,
    ProFormRadio,
    ProFormSelect,
    ProFormText,
    ProFormTextArea,
} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";

export interface UserModalProps {
    open: boolean
    handleOk: (values: any) => void
    handleCancel: () => void
    confirmLoading: boolean
    id: string | undefined
}

const UserModal = ({open, handleOk, handleCancel, confirmLoading, id}: UserModalProps) => {

    const formRef = useRef<ProFormInstance>();
    let {t} = useTranslation();

    const get = async () => {
        if (id) {
            return await userApi.getById(id);
        }
        return {
            type: 'user',
            recording: 'enabled',
            watermark: 'enabled',
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
                <Row gutter={8}>
                    <Col span={12}>
                        <ProFormText name={'nickname'} label={t('identity.user.nickname')} rules={[{required: true}]}/>
                    </Col>
                    <Col span={12}>
                        <ProFormText name={'username'} label={t('identity.user.username')} rules={[{required: true}]}/>
                    </Col>
                </Row>

                <ProFormRadio.Group
                    label={t('identity.user.type')} name='type' rules={[{required: true}]}
                    options={[
                        {label: t('identity.user.types.super_admin'), value: 'super-admin'},
                        {label: t('identity.user.types.admin'), value: 'admin'},
                        {label: t('identity.user.types.normal'), value: 'user'},
                    ]}
                />

                <ProFormDependency name={['type']}>
                    {({type}) => {
                        if (type !== 'admin') {
                            return null;
                        }
                        return (
                            <ProFormSelect
                                label={t('identity.user.role')} name='roles'
                                fieldProps={{
                                    mode: 'multiple'
                                }}
                                request={async () => {
                                    let items = await roleApi.getAll();
                                    return items.map(item => {
                                        return {
                                            label: item.name,
                                            value: item.id,
                                        }
                                    });
                                }}
                            />
                        )
                    }}
                </ProFormDependency>

                <Row gutter={8}>
                    <Col span={12}>
                        <ProFormRadio.Group
                            label={t('identity.user.recording')} name='recording' rules={[{required: true}]}
                            options={[
                                {label: t('general.enabled'), value: 'enabled'},
                                {label: t('general.disabled'), value: 'disabled'},
                            ]}
                        />
                    </Col>
                    <Col span={12}>
                        <ProFormRadio.Group
                            label={t('identity.user.watermark')} name='watermark' rules={[{required: true}]}
                            options={[
                                {label: t('general.enabled'), value: 'enabled'},
                                {label: t('general.disabled'), value: 'disabled'},
                            ]}
                        />
                    </Col>
                </Row>

                <Row gutter={8}>
                    <Col span={12}>
                        <ProFormText name={'mail'} label={t('identity.user.mail')} rules={[{type: "email"}]}/>
                    </Col>
                    <Col span={12}>
                        <ProFormText name={'phone'} label={t('identity.user.phone')}/>
                    </Col>
                </Row>

                <ProFormTextArea label={t('identity.user.public_key')} name='publicKey'
                                 placeholder='Public Key'
                                 fieldProps={{rows: 4}}/>

                {!id &&
                    <ProFormText.Password
                        name={'password'}
                        label={t('identity.user.password')}
                    />
                }
            </ProForm>
        </Modal>
    )
};

export default UserModal;
