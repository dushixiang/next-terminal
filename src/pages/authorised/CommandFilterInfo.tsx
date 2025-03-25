import commandFilterApi from "../../api/command-filter-api.js";
import {ProDescriptions} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";

const api = commandFilterApi;

interface Props {
    id: string
}

const CommandFilterInfo = ({id}: Props) => {

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
                <ProDescriptions.Item label={t("authorised.command_filter.name")} dataIndex="name"/>
                <ProDescriptions.Item label={t('general.created_at')} dataIndex="createdAt" valueType='dateTime'/>
            </ProDescriptions>
        </div>
    );
};

export default CommandFilterInfo;