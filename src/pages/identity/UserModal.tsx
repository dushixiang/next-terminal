import { useFormRequest } from "@/hook/use-antd-form-query";
import QuerySelect from "@/components/QuerySelect";
import React, { useRef } from 'react';
import { FormInstance, Col, Modal, Row, Form, Input, Radio, Select } from 'antd';
import roleApi from "../../api/role-api";
import userApi from "../../api/user-api";
import departmentApi from "../../api/department-api";
import { useTranslation } from "react-i18next";
import ProFormTreeSelect from "@/components/ProFormTreeSelect";
export interface UserModalProps {
  open: boolean;
  handleOk: (values: any) => void;
  handleCancel: () => void;
  confirmLoading: boolean;
  id: string | undefined;
}
const UserModal = ({
  open,
  handleOk,
  handleCancel,
  confirmLoading,
  id
}: UserModalProps) => {
  const formRef = useRef<FormInstance>(null);
  let {
    t
  } = useTranslation();
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
      source: 'local'
    };
  };
  useFormRequest(formRef, ["form-request", "web/src/pages/identity/UserModal.tsx", open, id], get, open);
  return <Modal title={id ? t('actions.edit') : t('actions.new')} open={open} mask={{
    closable: false
  }} destroyOnHidden={true} onOk={() => {
    formRef.current?.validateFields().then(async values => {
      // 转换 departments 字段格式：从 [{label, value}] 转为 [value1, value2]
      if (values.departments && Array.isArray(values.departments)) {
        values.departments = values.departments.map((dept: any) => {
          return typeof dept === 'object' ? dept.value : dept;
        });
      }
      handleOk(values);
    });
  }} onCancel={() => {
    handleCancel();
  }} confirmLoading={confirmLoading}>

            <Form ref={formRef} layout="vertical">
                <Form.Item hidden={true} name={'id'}>
    <Input />
      </Form.Item>
                <Row gutter={8}>
                    <Col span={12}>
                        <Form.Item name={'nickname'} label={t('identity.user.nickname')} rules={[{
            required: true
          }]}>
    <Input />
          </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name={'username'} label={t('gateways.username')} rules={[{
            required: true
          }]}>
    <Input />
          </Form.Item>
                    </Col>
                </Row>

                <Form.Item label={t('identity.user.type')} name='type' rules={[{
        required: true
      }]}>
    <Radio.Group options={[{
          label: t('identity.user.types.super_admin'),
          value: 'super-admin'
        }, {
          label: t('identity.user.types.admin'),
          value: 'admin'
        }, {
          label: t('identity.user.types.normal'),
          value: 'user'
        }]} />
      </Form.Item>

                <Form.Item noStyle={true} shouldUpdate={true}>{form => (({
          type
        }) => {
          if (type !== 'admin') {
            return null;
          }
          return <Form.Item label={t('menus.identity.submenus.role')} name='roles'>
    <QuerySelect
              mode='multiple'
              request={async () => {
              let items = await roleApi.getAll();
              return items.map(item => {
                return {
                  label: item.name,
                  value: item.id
                };
              });
            }} />
          </Form.Item>;
        })(form.getFieldsValue(true), form)}</Form.Item>

                <ProFormTreeSelect label={t('menus.identity.submenus.department')} name='departments' fieldProps={{
        multiple: true,
        treeCheckable: true,
        showCheckedStrategy: 'SHOW_ALL',
        placeholder: t('identity.user.select_department'),
        treeDefaultExpandAll: true,
        treeCheckStrictly: true
      }} request={async () => {
        return await departmentApi.getTree();
      }} />

                <Row gutter={8}>
                    <Col span={12}>
                        <Form.Item label={t('identity.user.recording')} name='recording' rules={[{
            required: true
          }]}>
    <Radio.Group options={[{
              label: t('general.enabled'),
              value: 'enabled'
            }, {
              label: t('general.disabled'),
              value: 'disabled'
            }]} />
          </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label={t('identity.user.watermark')} name='watermark' rules={[{
            required: true
          }]}>
    <Radio.Group options={[{
              label: t('general.enabled'),
              value: 'enabled'
            }, {
              label: t('general.disabled'),
              value: 'disabled'
            }]} />
          </Form.Item>
                    </Col>
                </Row>

                <Row gutter={8}>
                    <Col span={12}>
                        <Form.Item name={'mail'} label={t('identity.user.mail')} rules={[{
            type: "email"
          }]}>
    <Input />
          </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name={'phone'} label={t('identity.user.phone')}>
    <Input />
          </Form.Item>
                    </Col>
                </Row>

                <Row gutter={8}>
                    <Col span={12}>
                        <Form.Item name={'source'} label={t('audit.accessLog.stats.table.referer')}>
    <Select options={[{
              label: t('identity.user.sources.local'),
              value: 'local'
            }, {
              label: t('identity.user.sources.ldap'),
              value: 'ldap'
            }, {
              label: t('identity.user.sources.wechat'),
              value: 'wechat'
            }, {
              label: t('identity.user.sources.oidc'),
              value: 'oidc'
            }]} />
          </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name={'remark'} label={t('general.remark')}>
    <Input />
          </Form.Item>
                    </Col>
                </Row>

                {!id && <Form.Item name={'password'} label={t('assets.password')}>
    <Input.Password />
      </Form.Item>}
            </Form>
        </Modal>;
};
export default UserModal;
