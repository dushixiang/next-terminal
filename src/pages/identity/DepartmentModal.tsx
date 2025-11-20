import React, {useEffect, useState} from 'react';
import {Form, Input, InputNumber, Modal, TreeSelect} from "antd";
import {useTranslation} from "react-i18next";
import {useQuery} from "@tanstack/react-query";
import departmentApi, {Department, TreeNode} from "@/api/department-api";
import userApi from "@/api/user-api";

export interface DepartmentModalProps {
    id?: string
    open: boolean
    confirmLoading: boolean
    handleCancel: () => void
    handleOk: (values: any) => void
}

const DepartmentModal = ({id, open, confirmLoading, handleCancel, handleOk}: DepartmentModalProps) => {

    const {t} = useTranslation();
    const [form] = Form.useForm();
    const [department, setDepartment] = useState<Department>();

    // 获取部门详情
    const {data: departmentDetail} = useQuery({
        queryKey: ['department', id],
        queryFn: () => departmentApi.getById(id!),
        enabled: !!id && open,
    });

    // 获取部门树（用于选择父部门）
    const {data: departmentTree} = useQuery({
        queryKey: ['department-tree'],
        queryFn: () => departmentApi.getTree(),
        enabled: open,
    });

    // 获取用户列表（用于选择负责人）
    const {data: users} = useQuery({
        queryKey: ['users-all'],
        queryFn: () => userApi.getAll(),
        enabled: open,
    });

    useEffect(() => {
        if (departmentDetail) {
            setDepartment(departmentDetail);
            form.setFieldsValue({
                ...departmentDetail,
            });
        } else if (open && !id) {
            // 新建时重置表单
            form.resetFields();
            setDepartment(undefined);
        }
    }, [departmentDetail, form, id, open]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const submitData = {
                ...values,
                id: department?.id,
                leaders: values.leaders || [],
            };
            handleOk(submitData);
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    // 构建部门树选择器数据
    const buildTreeSelectData = (nodes: TreeNode[], excludeId?: string): any[] => {
        return nodes
            .filter(node => node.key !== excludeId) // 排除当前编辑的部门
            .map(node => ({
                title: node.title,
                value: node.value,
                children: node.children ? buildTreeSelectData(node.children, excludeId) : undefined,
            }));
    };

    return (
        <Modal
            title={department ? t('actions.edit') : t('actions.new')}
            open={open}
            onOk={handleSubmit}
            onCancel={handleCancel}
            confirmLoading={confirmLoading}
            width={600}
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={{
                    weight: 0,
                    leaders: [],
                }}
            >
                <Form.Item
                    label={t('general.name')}
                    name="name"
                    rules={[
                        {required: true, message: t('general.name') + t('general.required')},
                        {max: 100, message: t('general.name') + t('general.max_length', {max: 100})}
                    ]}
                >
                    <Input placeholder={t('identity.department.name_placeholder')}/>
                </Form.Item>

                <Form.Item
                    label={t('identity.department.parent')}
                    name="parentId"
                >
                    <TreeSelect
                        placeholder={t('identity.department.parent_placeholder')}
                        allowClear
                        showSearch
                        treeDefaultExpandAll
                        treeData={departmentTree ? buildTreeSelectData(departmentTree, department?.id) : []}
                        filterTreeNode={(input, node) =>
                            (node?.title as string)?.toLowerCase().includes(input.toLowerCase())
                        }
                    />
                </Form.Item>

                <Form.Item
                    label={t('identity.department.weight')}
                    name="weight"
                    tooltip={t('identity.department.weight_tooltip')}
                >
                    <InputNumber
                        min={0}
                        max={9999}
                        placeholder={t('identity.department.weight_placeholder')}
                        style={{width: '100%'}}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default DepartmentModal;
