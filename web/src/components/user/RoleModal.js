import React, {useState} from 'react';
import {Form, Input, Modal, Tree} from "antd";
import roleApi from "../../api/role";
import permissionApi from "../../api/permission";
import {useQuery} from "react-query";
import strings from "../../utils/strings";

const api = roleApi;

const formItemLayout = {
    labelCol: {span: 4},
    wrapperCol: {span: 18},
};

const findTreePath = (tree, filter, path = []) => {
    if (!tree) return []
    for (const data of tree) {
        // 这里按照你的需求来存放最后返回的内容吧
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
                       visible,
                       handleOk,
                       handleCancel,
                       confirmLoading,
                       id,
                   }) => {

    const [form] = Form.useForm();

    let [roleMenus, setRoleMenus] = useState([]);

    useQuery('roleQuery', () => api.getById(id), {
        enabled: visible && strings.hasText(id),
        onSuccess: (data) => {
            form.setFieldsValue(data);
            let roleMenus = [];
            for (let i = 0; i < data.menus.length; i++) {
                if (data.menus[i].checked === true) {
                    roleMenus.push(data.menus[i].menuId);
                }
            }
            setRoleMenus(roleMenus);
        }
    });

    let menuQuery = useQuery('menuQuery', permissionApi.getMenus, {
        enabled: visible,
    });

    const onCheck = (checkedKeysValue) => {
        let menus = new Set();
        for (let i = 0; i < checkedKeysValue.length; i++) {
            let key = checkedKeysValue[i];

            let paths = findTreePath(menuQuery.data, item => item.key === key);
            for (let j = 0; j < paths.length; j++) {
                let path = paths[j];
                if (j + 1 === paths.length) {
                    menus.add(JSON.stringify({
                        menuId: path,
                        checked: true
                    }))
                } else {
                    menus.add(JSON.stringify({
                        menuId: path,
                        checked: false
                    }))
                }
            }
        }
        console.log(menus)
        setRoleMenus(checkedKeysValue);
        form.setFieldsValue({
            menus: Array.from(menus).map(item => JSON.parse(item))
        })
    };

    return (
        <Modal
            width={960}
            title={id ? '更新角色' : '新建角色'}
            visible={visible}
            maskClosable={false}
            destroyOnClose={true}
            onOk={() => {
                form
                    .validateFields()
                    .then(async values => {
                        let ok = await handleOk(values);
                        if (ok) {
                            form.resetFields();
                        }
                    });
            }}
            onCancel={() => {
                form.resetFields();
                setRoleMenus([]);
                handleCancel();
            }}
            confirmLoading={confirmLoading}
            okText='确定'
            cancelText='取消'
        >

            <Form form={form} {...formItemLayout}>
                <Form.Item name='id' noStyle>
                    <Input hidden={true}/>
                </Form.Item>

                <Form.Item label="名称" name='name' rules={[{required: true, message: '请输入角色名称'}]}>
                    <Input autoComplete="off" placeholder="请输入角色名称"/>
                </Form.Item>

                <Form.Item label="权限" name='menus' rules={[{required: true}]}>
                    <Tree
                        checkable
                        onCheck={onCheck}
                        checkedKeys={roleMenus}
                        treeData={menuQuery.data}
                    />

                    {/*<div style={{marginTop: 5}}>*/}
                    {/*    {*/}
                    {/*        menuQuery.data?.map(item => {*/}
                    {/*            return <div>*/}
                    {/*                <div style={{fontWeight: "bold"}}>{item.title}</div>*/}
                    {/*                {*/}
                    {/*                    item.children?.map(c=>{*/}
                    {/*                        return <div>{c.title}</div>*/}
                    {/*                    })*/}
                    {/*                }*/}
                    {/*                <Divider dashed />*/}
                    {/*            </div>*/}
                    {/*        })*/}
                    {/*    }*/}
                    {/*</div>*/}
                </Form.Item>

            </Form>
        </Modal>
    )
};

export default RoleModal;
