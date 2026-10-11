import { useFormRequest } from "@/hook/use-antd-form-query";
import {type Key, useState} from 'react';
import {Form, Modal, Tree, Input} from "antd";
import roleApi, { TreeNode } from "../../api/role-api";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {localizeRoleMenus} from './role-menu-labels';
const api = roleApi;
interface RoleProps {
  open: boolean;
  handleOk: (values: any) => void;
  handleCancel: () => void;
  confirmLoading: boolean;
  id: string | undefined;
}
const findTreePath = (tree: TreeNode[] | undefined, filter: (node: TreeNode) => boolean, path: string[] = []): string[] => {
  if (!tree) return [];
  for (const data of tree) {
    path.push(data.key);
    if (filter(data)) return path;
    if (data.children) {
      const findChildren = findTreePath(data.children, filter, path);
      if (findChildren.length) return findChildren;
    }
    path.pop();
  }
  return [];
};
const RoleModal = ({
  open,
  handleOk,
  handleCancel,
  confirmLoading,
  id
}: RoleProps) => {
  let {
    t, i18n
  } = useTranslation();
  const [form] = Form.useForm();
  let [checkedMenus, setCheckedMenus] = useState<string[]>([]);
  const get = async () => {
    if (id) {
      let role = await api.getById(id);
      let strings = role.menus?.filter(item => item.checked === true).map(item => item.key) ?? [];
      setCheckedMenus(strings);
      return role;
    }
    return {};
  };
  let menusQuery = useQuery({
    queryKey: ['menus'],
    queryFn: roleApi.getMenus,
    enabled: open
  });
  const onCheck = (checkedKeysValue: Key[] | { checked: Key[]; halfChecked: Key[] }) => {
    const checkedKeys = Array.isArray(checkedKeysValue) ? checkedKeysValue : checkedKeysValue.checked;
    const menuKeys = checkedKeys.map(String);
    let menus = new Set<string>();
    for (let i = 0; i < menuKeys.length; i++) {
      let key = menuKeys[i];
      let paths = findTreePath(menusQuery.data, item => item.key === key);
      for (let j = 0; j < paths.length; j++) {
        let path = paths[j];
        menus.add(JSON.stringify({
          key: path,
          checked: j + 1 === paths.length
        }));
      }
    }
    setCheckedMenus(menuKeys);
    form.setFieldsValue({
      menus: Array.from(menus).map(item => JSON.parse(item))
    });
  };
  useFormRequest(form, ["form-request", "web/src/pages/identity/RoleModal.tsx", open, id], get, {enabled: open});
  return <Modal title={id ? t('actions.edit') : t('actions.new')} open={open} mask={{
    closable: false
  }} destroyOnHidden={true} onOk={() => {
    form.validateFields().then(async values => {
      handleOk(values);
    });
  }} onCancel={() => {
    handleCancel();
  }} confirmLoading={confirmLoading}>
            <Form form={form} clearOnDestroy={true} layout="vertical">
                <Form.Item hidden={true} name={'id'}>
    <Input />
      </Form.Item>
                <Form.Item name={'name'} label={t('general.name')} rules={[{
        required: true
      }]}>
    <Input />
      </Form.Item>

                <Form.Item label={t('identity.role.permission')} name='menus' rules={[{
        required: true
      }]}>
                    <Tree checkable onCheck={onCheck} checkedKeys={checkedMenus} treeData={localizeRoleMenus(menusQuery.data ?? [], t, i18n)} />
                </Form.Item>
            </Form>
        </Modal>;
};
export default RoleModal;
