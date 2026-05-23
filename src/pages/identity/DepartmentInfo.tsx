import React from 'react';
import departmentApi from "../../api/department-api";
import {useTranslation} from "react-i18next";
import {useQuery} from "@tanstack/react-query";
import {Descriptions, Space, Spin, Tag} from "antd";
import NLink from "@/components/NLink";
import times from "@/components/time/times";

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
        <Spin spinning={!department && active}>
            <Descriptions
                column={1}
                title={t('actions.detail')}
            >
                <Descriptions.Item label={t('general.name')}>{department?.name}</Descriptions.Item>
                <Descriptions.Item label={t('identity.department.parent')}>
                    {!department?.parentId ? (
                        <Tag color="green">{t('identity.department.root')}</Tag>
                    ) : parentDepartment ? (
                        <Tag color="blue">{parentDepartment.name}</Tag>
                    ) : (
                        <Tag color="default">{department.parentId}</Tag>
                    )}
                </Descriptions.Item>
                <Descriptions.Item label={t('assets.sort')}>{department?.weight}</Descriptions.Item>
                <Descriptions.Item label={t('general.created_at')}>
                    {department?.createdAt ? times.format(department.createdAt) : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="ID">{department?.id}</Descriptions.Item>
                <Descriptions.Item label={t('actions.authorized')}>
                    <Space size={12} wrap>
                        <NLink to={`/authorised-asset?departmentId=${id}`}>
                            {`${t('menus.resource.submenus.asset')}${t('actions.authorized')}`}
                        </NLink>
                        <NLink to={`/authorised-website?departmentId=${id}`}>
                            {`${t('menus.resource.submenus.website')}${t('actions.authorized')}`}
                        </NLink>
                    </Space>
                </Descriptions.Item>
            </Descriptions>
        </Spin>
    );
};

export default DepartmentInfo;
