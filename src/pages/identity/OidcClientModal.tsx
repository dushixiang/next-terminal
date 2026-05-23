import { useFormRequest } from "@/hook/use-antd-form-query";
import QuerySelect from "@/components/QuerySelect";
import React, { useRef } from 'react';
import { Button, FormInstance, Modal, Form, Input, Checkbox, Radio, Space } from 'antd';
import { useTranslation } from "react-i18next";
import oidcClientApi from "@/api/oidc-client-api";
import userApi from "@/api/user-api";
import departmentApi from "@/api/department-api";
export interface OidcClientModalProps {
  visible: boolean;
  onOk: (values: any) => void;
  onCancel: () => void;
  confirmLoading: boolean;
  id: string | undefined;
}
const OidcClientModal = ({
  visible,
  onOk,
  onCancel,
  confirmLoading,
  id
}: OidcClientModalProps) => {
  const formRef = useRef<FormInstance>(null);
  const {
    t
  } = useTranslation();
  const get = async () => {
    if (id) {
      const client = await oidcClientApi.getById(id);
      return {
        ...client,
        redirectUris: (client.redirectUris || []).map((url: string) => ({
          url
        })),
        accessControl: client.accessControl || 'all'
      };
    }
    return {
      grantTypes: ['authorization_code', 'refresh_token'],
      scopes: ['openid', 'profile', 'email'],
      redirectUris: [],
      accessControl: 'all' // 默认允许所有用户
    };
  };
  const handleSubmit = async (values: any) => {
    // 转换 redirectUris 格式：从对象数组转为字符串数组
    if (values.redirectUris && Array.isArray(values.redirectUris)) {
      values.redirectUris = values.redirectUris.map((item: any) => (item?.url ?? '').trim()).filter((url: string) => url);
    }

    // 提交表单（包含 boundUserIds 和 boundDepartmentIds）
    await onOk(values);
  };
  useFormRequest(formRef, ["form-request", "web/src/pages/identity/OidcClientModal.tsx", visible, id], get, visible);
  return <Modal title={id ? t('actions.edit') : t('actions.new')} open={visible} mask={{
    closable: false
  }} destroyOnHidden={true} onOk={() => {
    formRef.current?.validateFields().then(handleSubmit);
  }} onCancel={onCancel} confirmLoading={confirmLoading} width={700}>
            <Form ref={formRef} layout="vertical">
                <Form.Item hidden={true} name={'id'}>
    <Input />
      </Form.Item>

                <Form.Item name={'name'} label={t('general.name')} rules={[{
        required: true,
        message: t('identity.oidc_client.name_required')
      }]}>
    <Input placeholder={t('identity.oidc_client.name_placeholder')} />
      </Form.Item>

                <Form.Item name={'clientId'} label={t('identity.oidc_client.client_id_label')} rules={[{
        required: true,
        message: t('identity.oidc_client.client_id_required')
      }]} tooltip={id ? t('identity.oidc_client.client_id_tooltip') : undefined}>
    <Input disabled={!!id} placeholder={t('identity.oidc_client.client_id_placeholder')} />
      </Form.Item>

                <Form.Item label={t('identity.oidc_client.redirect_uris')} required>
                  <Form.List name="redirectUris" rules={[{
        validator: async (_, value) => {
          if (!value || value.length === 0) {
            return Promise.reject(new Error(t('identity.oidc_client.redirect_uris_required')));
          }
          return Promise.resolve();
        }
      }]}>
                    {(fields, {add, remove}) => <>
                      {fields.map(field => (
                        <Space key={field.key} align="baseline" style={{display: 'flex'}}>
                          <Form.Item
                            {...field}
                            name={[field.name, 'url']}
                            rules={[{
                              required: true,
                              message: t('identity.oidc_client.redirect_uri_required')
                            }, {
                              type: 'url',
                              message: t('general.invalid_url')
                            }]}
                            style={{flex: 1}}
                          >
                            <Input placeholder="https://example.com/callback" />
                          </Form.Item>
                          <Button danger type="link" onClick={() => remove(field.name)}>
                            -
                          </Button>
                        </Space>
                      ))}
                      <Button type="dashed" onClick={() => add()} block>
                        {t('identity.oidc_client.redirect_uris_add')}
                      </Button>
                    </>}
                  </Form.List>
                </Form.Item>

                <Form.Item name="grantTypes" label={t('identity.oidc_client.grant_types')} rules={[{
        required: true,
        message: t('identity.oidc_client.grant_types_required')
      }]}>
    <Checkbox.Group options={[{
          label: 'Authorization Code',
          value: 'authorization_code'
        }, {
          label: 'Refresh Token',
          value: 'refresh_token'
        }, {
          label: 'Client Credentials',
          value: 'client_credentials'
        }]} />
      </Form.Item>

                <Form.Item name="scopes" label={t('identity.oidc_client.scopes')} rules={[{
        required: true,
        message: t('identity.oidc_client.scopes_required')
      }]}>
    <Checkbox.Group options={[{
          label: 'OpenID',
          value: 'openid'
        }, {
          label: 'Profile',
          value: 'profile'
        }, {
          label: 'Email',
          value: 'email'
        }, {
          label: 'Offline Access',
          value: 'offline_access'
        }]} />
      </Form.Item>

                <Form.Item name="accessControl" label={t('identity.oidc_client.access_control')} tooltip={t('identity.oidc_client.access_control_tip')} initialValue="all">
    <Radio.Group options={[{
          label: t('identity.oidc_client.access_all_users'),
          value: 'all'
        }, {
          label: t('identity.oidc_client.access_departments'),
          value: 'department'
        }, {
          label: t('identity.oidc_client.access_users'),
          value: 'user'
        }]} />
      </Form.Item>

                <Form.Item noStyle={true} shouldUpdate={true}>{form => (({
          accessControl
        }) => {
          if (accessControl === 'user') {
            return <Form.Item name="boundUserIds" label={t('identity.oidc_client.bound_users')} rules={[{
              required: true,
              message: t('identity.oidc_client.bound_users_required')
            }]}>
    <QuerySelect
                mode='multiple'
                showSearch={true}
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                placeholder={t('identity.oidc_client.bound_users_placeholder')}
                request={async () => {
                const users = await userApi.getAll();
                return users.map((user: any) => ({
                  label: `${user.nickname} (${user.username})`,
                  value: user.id
                }));
              }} />
            </Form.Item>;
          }
          if (accessControl === 'department') {
            return <Form.Item name="boundDepartmentIds" label={t('identity.oidc_client.bound_departments')} rules={[{
              required: true,
              message: t('identity.oidc_client.bound_departments_required')
            }]}>
    <QuerySelect
                mode='multiple'
                showSearch={true}
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                placeholder={t('identity.oidc_client.bound_departments_placeholder')}
                request={async () => {
                const departments = await departmentApi.getAll();
                return departments.map((dept: any) => ({
                  label: dept.name,
                  value: dept.id
                }));
              }} />
            </Form.Item>;
          }
          return null;
        })(form.getFieldsValue(true), form)}</Form.Item>

                <Form.Item name={'description'} label={t('general.description')}>
    <Input.TextArea
          rows={3}
          placeholder={t('identity.oidc_client.description_placeholder')} />
      </Form.Item>
            </Form>
        </Modal>;
};
export default OidcClientModal;
