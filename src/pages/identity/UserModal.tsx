import React, {useRef} from 'react';
import {Col, Modal, Row} from "antd";
import roleApi from "../../api/role-api";
import userApi from "../../api/user-api";
import departmentApi from "../../api/department-api";
import {
    ProForm,
    ProFormDependency,
    ProFormInstance,
    ProFormRadio,
    ProFormSelect,
    ProFormText,
    ProFormTextArea,
    ProFormTreeSelect,
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
            const user = await userApi.getById(id);
            // 后端返回的 departments 已经是字符串数组，无需转换
            return user;
        }
        return {
            type: 'user',
            recording: 'enabled',
            watermark: 'enabled',
            source: 'local',
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
                        // 转换 departments 字段格式：从 [{label, value}] 转为 [value1, value2]
                        if (values.departments && Array.isArray(values.departments)) {
                            values.departments = values.departments.map((dept: any) => {
                                return typeof dept === 'object' ? dept.value : dept;
                            });
                        }
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

                <ProFormTreeSelect
                    label={t('identity.user.department')}
                    name='departments'
                    fieldProps={{
                        multiple: true,
                        treeCheckable: true,
                        showCheckedStrategy: 'SHOW_ALL',
                        placeholder: t('identity.user.select_department'),
                        treeDefaultExpandAll: true,
                        treeCheckStrictly: true,
                    }}
                    request={async () => {
                        return await departmentApi.getTree();
                    }}
                />

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

                <Row gutter={8}>
                    <Col span={12}>
                        <ProFormSelect 
                            name={'source'} 
                            label={t('identity.user.source')} 
                            options={[
                                {label: t('identity.user.sources.local'), value: 'local'},
                                {label: t('identity.user.sources.ldap'), value: 'ldap'},
                                {label: t('identity.user.sources.wechat'), value: 'wechat'},
                                {label: t('identity.user.sources.oidc'), value: 'oidc'},
                            ]}
                        />
                    </Col>
                    <Col span={12}>
                        <ProFormText name={'remark'} label={t('general.remark')}/>
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
