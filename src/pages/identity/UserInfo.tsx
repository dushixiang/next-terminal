import userApi from "../../api/user-api";
import {ProDescriptions} from "@ant-design/pro-components";
import React from "react";
import {useTranslation} from "react-i18next";

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

    return (
        <div className={'page-detail-info'}>
            <ProDescriptions column={1} request={get}>
                <ProDescriptions.Item label={t('identity.user.username')} dataIndex="username"/>
                <ProDescriptions.Item label={t('identity.user.nickname')} dataIndex="nickname"/>
                <ProDescriptions.Item label={t('identity.user.mail')} dataIndex="mail"/>
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
                <ProDescriptions.Item label={t('general.created_at')} dataIndex="createdAt" valueType='dateTime'/>
            </ProDescriptions>
        </div>
    );
};

export default UserInfo;