import userApi from "../../api/user-api";
import {ProDescriptions} from "@ant-design/pro-components";
import React from "react";
import {useTranslation} from "react-i18next";
import {Space} from "antd";
import NLink from "@/components/NLink";

interface UserInfoProps {
    active: boolean
    id: string
}

const UserInfo = ({active, id}: UserInfoProps) => {

    let {t} = useTranslation();

    const get = async () => {
        let data = await userApi.getById(id);
        return {
            success: true,
            data: data
        }
    }

    const sourceMap: Record<string, string> = {
        'local': t('identity.user.sources.local'),
        'ldap': t('identity.user.sources.ldap'),
        'wechat': t('identity.user.sources.wechat'),
        'oidc': t('identity.user.sources.oidc'),
        // 兼容旧值
        'self': t('identity.user.sources.local'),
        'wechat-work': t('identity.user.sources.wechat'),
    };

    return (
        <div className={'page-detail-info'}>
            <ProDescriptions column={1} request={get}>
                <ProDescriptions.Item label={t('identity.user.username')} dataIndex="username"/>
                <ProDescriptions.Item label={t('identity.user.nickname')} dataIndex="nickname"/>
                <ProDescriptions.Item label={t('identity.user.mail')} dataIndex="mail"/>
                <ProDescriptions.Item 
                    label={t('identity.user.source')} 
                    dataIndex="source"
                    render={(_, record) => sourceMap[record.source] || record.source}
                />
                <ProDescriptions.Item label={t('general.remark')} dataIndex="remark"/>
                <ProDescriptions.Item label={t('identity.user.status')} dataIndex="status" valueEnum={{
                    disabled: {
                        text: t('general.disabled'),
                        status: 'Error',
                    },
                    enabled: {
                        text: t('general.enabled'),
                        status: 'Success',
                    },
                }}/>
                <ProDescriptions.Item label={t('identity.user.otp')} dataIndex="enabledTotp" valueEnum={{
                    disabled: {
                        text: t('general.disabled'),
                        status: 'Error',
                    },
                    enabled: {
                        text: t('general.enabled'),
                        status: 'Success',
                    },
                }}/>
                <ProDescriptions.Item label={t('authorised.label.authorised')}>
                    <Space size={12} wrap>
                        <NLink to={`/authorised-asset?userId=${id}`}>
                            {`${t('authorised.label.asset')}${t('authorised.label.authorised')}`}
                        </NLink>
                        <NLink to={`/authorised-website?userId=${id}`}>
                            {`${t('authorised.label.website')}${t('authorised.label.authorised')}`}
                        </NLink>
                    </Space>
                </ProDescriptions.Item>
                <ProDescriptions.Item label={t('general.created_at')} dataIndex="createdAt" valueType='dateTime'/>
            </ProDescriptions>
        </div>
    );
};

export default UserInfo;
