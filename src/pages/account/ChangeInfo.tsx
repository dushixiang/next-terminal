import React from 'react';
import {ProForm, ProFormSelect, ProFormText, ProFormTextArea} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {App, Typography} from "antd";
import accountApi, {AccountInfo} from "@/src/api/account-api";

const {Title} = Typography;

const ChangeInfo = () => {
    let {t} = useTranslation();

    let {message} = App.useApp();

    const get = async () => {
        return await accountApi.getUserInfo();
    }

    const set = async (info: AccountInfo) => {
        await accountApi.changeInfo(info);
        message.success(t('general.success'));
        window.location.reload();
        return true
    }

    return (
        <div>
            <Title level={5} style={{marginTop: 0}}>{t('account.change.info')}</Title>
            <div style={{margin: 16}}></div>
            <ProForm request={get} onFinish={set}>
                <ProFormText name={'nickname'} label={t('account.nickname')} rules={[{required: true}]}/>
                <ProFormSelect
                    name={'language'}
                    label={t('account.language')}
                    fieldProps={{
                        options: [
                            {value: 'en-US', label: 'English'},
                            {value: 'zh-CN', label: '中文（简体）'},
                            {value: 'zh-TW', label: '中文（繁体）'},
                            {value: 'ja-JP', label: '日本語'},
                        ]
                    }}
                />
                <ProFormTextArea label={t('account.public_key')} name='publicKey'
                                 placeholder='Public Key'
                                 fieldProps={{rows: 8}}/>
            </ProForm>
        </div>
    );
};

export default ChangeInfo;