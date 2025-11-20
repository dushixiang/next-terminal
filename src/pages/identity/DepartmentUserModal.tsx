import React, {useEffect, useState} from 'react';
import {message, Modal, Transfer} from "antd";
import {useTranslation} from "react-i18next";
import {useMutation, useQuery} from "@tanstack/react-query";
import departmentApi from "@/api/department-api";
import userApi, {User} from "@/api/user-api";

export interface DepartmentUserModalProps {
    departmentId?: string
    departmentName?: string
    open: boolean
    confirmLoading: boolean
    handleCancel: () => void
    handleOk: () => void
}

const DepartmentUserModal = ({
                                 departmentId,
                                 departmentName,
                                 open,
                                 confirmLoading,
                                 handleCancel,
                                 handleOk
                             }: DepartmentUserModalProps) => {

    const {t} = useTranslation();

    const [targetKeys, setTargetKeys] = useState<string[]>([]);

    // 获取所有用户
    const {data: allUsers = []} = useQuery({
        queryKey: ['users-all'],
        queryFn: () => userApi.getAll(),
        enabled: open,
    });

    // 获取部门当前的用户关联
    const departmentUsersQuery = useQuery({
        queryKey: ['department-users', departmentId],
        queryFn: () => departmentApi.getDepartmentUsers(departmentId!),
        enabled: !!departmentId && open,
    });

    useEffect(() => {
        if (!open) {
            setTargetKeys([]);
        }
    }, [open]);

    useEffect(() => {
        if (departmentUsersQuery.data) {
            setTargetKeys(departmentUsersQuery.data);
        }
    }, [departmentUsersQuery.data]);

    // 设置部门用户关联的mutation
    const setDepartmentUsersMutation = useMutation({
        mutationFn: (userIds: string[]) => departmentApi.setDepartmentUsers(departmentId!, userIds),
        onSuccess: () => {
            message.success(t('general.success'));
            handleOk();
        },
        onError: () => {
            message.error(t('general.error'));
        }
    });

    const handleTransferChange = (newTargetKeys: string[]) => {
        setTargetKeys(newTargetKeys);
    };

    const handleModalOk = () => {
        setDepartmentUsersMutation.mutate(targetKeys);
    };

    const dataSource = allUsers.map((user: User) => ({
        key: user.id,
        title: `${user.nickname} (${user.username})`,
        description: user.mail || user.username,
    }));

    return (
        <Modal
            title={`${t('identity.department.manage_users')} - ${departmentName}`}
            open={open}
            onOk={handleModalOk}
            onCancel={handleCancel}
            confirmLoading={confirmLoading || setDepartmentUsersMutation.isPending}
            width={600}
        >
            <Transfer
                dataSource={dataSource}
                titles={[t('identity.user.available'), t('identity.user.selected')]}
                targetKeys={targetKeys}
                onChange={handleTransferChange}
                render={item => item.title}
                showSearch
                filterOption={(inputValue, option) =>
                    option.title.toLowerCase().includes(inputValue.toLowerCase()) ||
                    (option.description && option.description.toLowerCase().includes(inputValue.toLowerCase()))
                }
                listStyle={{
                    width: 250,
                    height: 300,
                }}
            />
        </Modal>
    );
};

export default DepartmentUserModal;