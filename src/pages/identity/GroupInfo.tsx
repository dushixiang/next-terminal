import React from 'react';
import userGroupApi from "../../api/user-group-api";
import {ProDescriptions} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";

const api = userGroupApi;

interface UserGroupInfoProps {
    active: boolean
    id: string
}

const GroupInfo = ({active, id}: UserGroupInfoProps) => {

    let {t} = useTranslation();

    const get = async () => {
        let data = await api.getById(id);
        return {
            success: true,
            data: data
        }
    }

    return (
        <div className={'page-detail-info'}>
            <ProDescriptions column={1} request={get}>
                <ProDescriptions.Item label={t('general.name')} dataIndex="name"/>
                <ProDescriptions.Item label={t('general.created_at')} dataIndex="createdAt" valueType='dateTime'/>
            </ProDescriptions>
        </div>
    );
};

export default GroupInfo;