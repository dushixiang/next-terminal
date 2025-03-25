import React, {useRef, useState} from 'react';
import {Form, Modal, Tree} from "antd";
import roleApi, {TreeNode} from "../../api/role-api";
import {useQuery} from "@tanstack/react-query";
import {ProForm, ProFormInstance, ProFormText} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import strings from '@/src/utils/strings';

const api = roleApi;

export interface RoleProps {
    open: boolean
    handleOk: (values: any) => void
    handleCancel: () => void
    confirmLoading: boolean
    id: string | undefined
}

const findTreePath = (tree: TreeNode[], filter: (node: TreeNode) => boolean, path: string[] = []): string[] => {
    if (!tree) return []
    for (const data of tree) {
        path.push(data.key);
        if (filter(data)) return path;
        if (data.children) {
            const findChildren = findTreePath(data.children, filter, path);
            if (findChildren.length) return findChildren;
        }
        path.pop()
    }
    return []
}

const RoleModal = ({
                       open,
                       handleOk,
                       handleCancel,
                       confirmLoading,
                       id,
                   }: RoleProps) => {

    let {t} = useTranslation();
    const formRef = useRef<ProFormInstance>();

    let [checkedMenus, setCheckedMenus] = useState<string[]>([]);

    const get = async () => {
        if (id) {
            let role = await api.getById(id);
            let strings = role.menus?.filter(item => item.checked === true).map(item => item.key);
            setCheckedMenus(strings);
            return role;
        }
        return {};
    }

    const wrapGetMenu = async () => {
        let menus = await roleApi.getMenus();
        deepT('', menus);
        return menus;
    }

    const deepT = (parent: string, menus: TreeNode[]) => {
        for (let i = 0; i < menus.length; i++) {
            if (menus[i].isLeaf) {
                menus[i].title = t('permissions.' + menus[i].key);
            } else {
                let parentKey = parent.replaceAll('-', '_');
                let key = menus[i].key.replaceAll('-', '_');
                if (strings.hasText(parent)) {
                    menus[i].title = t(`menus.${parentKey}.submenus.${key}`);
                } else {
                    menus[i].title = t(`menus.${key}.label`);
                }
            }
            if (menus[i].children) {
                deepT(menus[i].key, menus[i].children);
            }
        }
    }

    let menusQuery = useQuery({
        queryKey: ['menus'],
        queryFn: wrapGetMenu,
        enabled: open,
    });

    const onCheck = (checkedKeysValue: string[]) => {
        let menus = new Set<string>();
        for (let i = 0; i < checkedKeysValue.length; i++) {
            let key = checkedKeysValue[i];

            let paths = findTreePath(menusQuery.data, item => item.key === key);
            for (let j = 0; j < paths.length; j++) {
                let path = paths[j];
                menus.add(JSON.stringify({
                    key: path,
                    checked: j + 1 === paths.length
                }))
            }
        }
        setCheckedMenus(checkedKeysValue);
        formRef.current.setFieldsValue({
            menus: Array.from(menus).map(item => JSON.parse(item))
        });
    };

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
                <ProFormText name={'name'} label={t('general.name')} rules={[{required: true}]}/>

                <Form.Item label={t('identity.role.permission')} name='menus' rules={[{required: true}]}>
                    <Tree
                        checkable
                        onCheck={onCheck}
                        checkedKeys={checkedMenus}
                        treeData={menusQuery.data}
                    />
                </Form.Item>
            </ProForm>
        </Modal>
    )
};

export default RoleModal;
