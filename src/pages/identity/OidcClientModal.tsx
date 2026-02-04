import React, {useRef} from 'react';
import {Modal} from "antd";
import {
    ProForm,
    ProFormCheckbox,
    ProFormDependency,
    ProFormInstance,
    ProFormList,
    ProFormRadio,
    ProFormSelect,
    ProFormText,
    ProFormTextArea,
} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import oidcClientApi from "@/api/oidc-client-api";
import userApi from "@/api/user-api";
import departmentApi from "@/api/department-api";

export interface OidcClientModalProps {
    visible: boolean
    onOk: (values: any) => void
    onCancel: () => void
    confirmLoading: boolean
    id: string | undefined
}

const OidcClientModal = ({visible, onOk, onCancel, confirmLoading, id}: OidcClientModalProps) => {

    const formRef = useRef<ProFormInstance>(null);
    const {t} = useTranslation();

    const get = async () => {
        if (id) {
            const client = await oidcClientApi.getById(id);
            return {
                ...client,
                redirectUris: (client.redirectUris || []).map((url: string) => ({url})),
                accessControl: client.accessControl || 'all',
            };
        }
        return {
            grantTypes: ['authorization_code', 'refresh_token'],
            scopes: ['openid', 'profile', 'email'],
            redirectUris: [],
            accessControl: 'all', // 默认允许所有用户
        };
    }

    const handleSubmit = async (values: any) => {
        // 转换 redirectUris 格式：从对象数组转为字符串数组
        if (values.redirectUris && Array.isArray(values.redirectUris)) {
            values.redirectUris = values.redirectUris
                .map((item: any) => (item?.url ?? '').trim())
                .filter((url: string) => url);
        }

        // 提交表单（包含 boundUserIds 和 boundDepartmentIds）
        await onOk(values);
    };

    return (
        <Modal
            title={id ? t('actions.edit') : t('actions.new')}
            open={visible}
            maskClosable={false}
            destroyOnHidden={true}
            onOk={() => {
                formRef.current?.validateFields()
                    .then(handleSubmit);
            }}
            onCancel={onCancel}
            confirmLoading={confirmLoading}
            width={700}
        >
            <ProForm formRef={formRef} request={get} submitter={false}>
                <ProFormText hidden={true} name={'id'}/>

                <ProFormText
                    name={'name'}
                    label={t('general.name')}
                    rules={[{required: true, message: t('identity.oidc_client.name_required')}]}
                    placeholder={t('identity.oidc_client.name_placeholder')}
                />

                <ProFormText
                    name={'clientId'}
                    label={t('identity.oidc_client.client_id_label')}
                    rules={[{required: true, message: t('identity.oidc_client.client_id_required')}]}
                    placeholder={t('identity.oidc_client.client_id_placeholder')}
                    disabled={!!id}
                    tooltip={id ? t('identity.oidc_client.client_id_tooltip') : undefined}
                />

                <ProFormList
                    name="redirectUris"
                    label={t('identity.oidc_client.redirect_uris')}
                    rules={[{
                        validator: async (_, value) => {
                            if (!value || value.length === 0) {
                                return Promise.reject(new Error(t('identity.oidc_client.redirect_uris_required')));
                            }
                            return Promise.resolve();
                        },
                    }]}
                    creatorButtonProps={{
                        creatorButtonText: t('identity.oidc_client.redirect_uris_add'),
                    }}
                    min={1}
                    copyIconProps={false}
                    alwaysShowItemLabel={false}
                    itemRender={({listDom, action}, {index}) => (
                        <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                            <div style={{flex: 1}}>{listDom}</div>
                            {action}
                        </div>
                    )}
                >
                    <ProFormText
                        name="url"
                        rules={[
                            {required: true, message: t('identity.oidc_client.redirect_uri_required')},
                            {type: 'url', message: t('general.invalid_url')}
                        ]}
                        placeholder="https://example.com/callback"
                    />
                </ProFormList>

                <ProFormCheckbox.Group
                    name="grantTypes"
                    label={t('identity.oidc_client.grant_types')}
                    rules={[{required: true, message: t('identity.oidc_client.grant_types_required')}]}
                    options={[
                        {label: 'Authorization Code', value: 'authorization_code'},
                        {label: 'Refresh Token', value: 'refresh_token'},
                        {label: 'Client Credentials', value: 'client_credentials'},
                    ]}
                />

                <ProFormCheckbox.Group
                    name="scopes"
                    label={t('identity.oidc_client.scopes')}
                    rules={[{required: true, message: t('identity.oidc_client.scopes_required')}]}
                    options={[
                        {label: 'OpenID', value: 'openid'},
                        {label: 'Profile', value: 'profile'},
                        {label: 'Email', value: 'email'},
                        {label: 'Offline Access', value: 'offline_access'},
                    ]}
                />

                <ProFormRadio.Group
                    name="accessControl"
                    label={t('identity.oidc_client.access_control')}
                    tooltip={t('identity.oidc_client.access_control_tip')}
                    initialValue="all"
                    options={[
                        {label: t('identity.oidc_client.access_all_users'), value: 'all'},
                        {label: t('identity.oidc_client.access_departments'), value: 'department'},
                        {label: t('identity.oidc_client.access_users'), value: 'user'},
                    ]}
                />

                <ProFormDependency name={['accessControl']}>
                    {({accessControl}) => {
                        if (accessControl === 'user') {
                            return (
                                <ProFormSelect
                                    name="boundUserIds"
                                    label={t('identity.oidc_client.bound_users')}
                                    placeholder={t('identity.oidc_client.bound_users_placeholder')}
                                    mode="multiple"
                                    fieldProps={{
                                        showSearch: true,
                                        filterOption: (input, option) =>
                                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                                    }}
                                    request={async () => {
                                        const users = await userApi.getAll();
                                        return users.map((user: any) => ({
                                            label: `${user.nickname} (${user.username})`,
                                            value: user.id,
                                        }));
                                    }}
                                    rules={[{required: true, message: t('identity.oidc_client.bound_users_required')}]}
                                />
                            );
                        }

                        if (accessControl === 'department') {
                            return (
                                <ProFormSelect
                                    name="boundDepartmentIds"
                                    label={t('identity.oidc_client.bound_departments')}
                                    placeholder={t('identity.oidc_client.bound_departments_placeholder')}
                                    mode="multiple"
                                    fieldProps={{
                                        showSearch: true,
                                        filterOption: (input, option) =>
                                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                                    }}
                                    request={async () => {
                                        const departments = await departmentApi.getAll();
                                        return departments.map((dept: any) => ({
                                            label: dept.name,
                                            value: dept.id,
                                        }));
                                    }}
                                    rules={[{required: true, message: t('identity.oidc_client.bound_departments_required')}]}
                                />
                            );
                        }

                        return null;
                    }}
                </ProFormDependency>

                <ProFormTextArea
                    name={'description'}
                    label={t('general.description')}
                    placeholder={t('identity.oidc_client.description_placeholder')}
                    fieldProps={{rows: 3}}
                />
            </ProForm>
        </Modal>
    )
};

export default OidcClientModal;
