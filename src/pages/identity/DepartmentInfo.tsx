import React from 'react';
import departmentApi from "../../api/department-api";
import {ProDescriptions} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {useQuery} from "@tanstack/react-query";
import {Tag} from "antd";

const api = departmentApi;

interface DepartmentInfoProps {
    active: boolean
    id: string
}

const DepartmentInfo = ({active, id}: DepartmentInfoProps) => {
    const {t} = useTranslation();

    // 获取部门详情
    const {data: department} = useQuery({
        queryKey: ['department', id],
        queryFn: () => api.getById(id),
        enabled: active && !!id,
    });

    // 获取父部门信息
    const {data: parentDepartment} = useQuery({
        queryKey: ['department', department?.parentId],
        queryFn: () => api.getById(department!.parentId),
        enabled: active && !!department?.parentId,
    });
    

    return (
        <ProDescriptions
            column={2}
            title={t('actions.detail')}
            dataSource={department}
            columns={[
                {
                    title: t('general.name'),
                    dataIndex: 'name',
                    copyable: true,
                },
                {
                    title: t('identity.department.parent'),
                    dataIndex: 'parentId',
                    render: () => {
                        if (!department?.parentId) {
                            return <Tag color="green">{t('identity.department.root')}</Tag>;
                        }
                        return parentDepartment ? (
                            <Tag color="blue">{parentDepartment.name}</Tag>
                        ) : (
                            <Tag color="default">{department.parentId}</Tag>
                        );
                    },
                },
                {
                    title: t('identity.department.weight'),
                    dataIndex: 'weight',
                },
                {
                    title: t('general.created_at'),
                    dataIndex: 'createdAt',
                    valueType: 'dateTime',
                },
                {
                    title: 'ID',
                    dataIndex: 'id',
                    copyable: true,
                },
            ]}
        />
    );
};

export default DepartmentInfo;
