import {Modal} from "antd";
import userGroupApi, {UserGroup} from "../../api/user-group-api";
import userApi from "../../api/user-api";
import {ProForm, ProFormInstance, ProFormSelect, ProFormText} from "@ant-design/pro-components";
import {useRef} from "react";
import {useTranslation} from "react-i18next";

const api = userGroupApi;

export interface GroupModalProps {
    open: boolean
    handleOk: (values: any) => void
    handleCancel: () => void
    confirmLoading: boolean
    id: string | undefined
}

const GroupModal = ({
                        open,
                        handleOk,
                        handleCancel,
                        confirmLoading,
                        id,
                    }: GroupModalProps) => {

    let {t} = useTranslation();
    const formRef = useRef<ProFormInstance>();

    const get = async () => {
        if (id) {
            let data = await api.getById(id);
            if (!data.members) {
                data.members = [];
            }
            return data;
        }
        return {} as UserGroup;
    }

    return (
        <Modal
            title={id ? t('actions.edit') : t('actions.new')}
            open={open}
            maskClosable={false}
            destroyOnHidden={true}
            onOk={() => {
                formRef.current?.validateFields()
                    .then(async values => {
                        handleOk(values);
                    });
            }}
            onCancel={() => {
                handleCancel();
            }}
            confirmLoading={confirmLoading}
        >

            <ProForm formRef={formRef} request={get} submitter={false}>
                <ProFormText hidden={true} name={'id'}/>
                <ProFormText name={'name'} label={t('general.name')} rules={[{required: true}]}/>
                <ProFormSelect
                    label={t('identity.user_group.members')} name='members'
                    fieldProps={{mode: 'multiple', showSearch: true}}
                    request={async () => {
                        let items = await userApi.getAll();
                        return items.map(item => {
                            return {
                                label: item.nickname,
                                value: item.id,
                            }
                        });
                    }}
                />
            </ProForm>
        </Modal>
    )
};

export default GroupModal;
