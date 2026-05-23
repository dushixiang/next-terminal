import {useFormRequest} from "@/hook/use-antd-form-query";
import React from 'react';
import {useTranslation} from "react-i18next";
import {useMutation} from "@tanstack/react-query";
import {App, Button, Form, Input, Typography} from "antd";
import accountApi, {AccountInfo} from "@/api/account-api";

const {
    Title
} = Typography;
const ChangeInfo = () => {
    const [form] = Form.useForm<AccountInfo>();
    let {
        t
    } = useTranslation();
    let {
        message
    } = App.useApp();
    const get = async () => {
        return await accountApi.getUserInfo();
    };
    const mutation = useMutation({
        mutationFn: async (info: AccountInfo) => {
            await accountApi.changeInfo(info);
        },
        onSuccess: () => {
            message.success(t('general.success'));
        }
    });
    useFormRequest(form, ["form-request", "web/src/pages/account/ChangeInfo.tsx"], get, true);
    return <div>
        <Title level={5} style={{
            marginTop: 0
        }}>{t('account.change.info')}</Title>
        <div style={{
            margin: 16
        }}></div>
        <Form form={form} onFinish={mutation.mutate} layout="vertical">
            <Form.Item name={'nickname'} label={t('identity.user.nickname')} rules={[{
                required: true
            }]}>
                <Input/>
            </Form.Item>
            <Form.Item>
                <Button type="primary" htmlType="submit" loading={mutation.isPending}>{t('actions.save')}</Button>
            </Form.Item>
        </Form>
    </div>;
};
export default ChangeInfo;
