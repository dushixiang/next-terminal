import {App, Input, Modal, Typography} from 'antd';
import React, {useEffect, useRef, useState} from 'react';
import {ProFormInstance} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import agentGatewayApi, {RegisterParam} from "@/src/api/agent-gateway-api";
import copy from "copy-to-clipboard";
import clsx from "clsx";

const {Paragraph} = Typography;

interface Props {
    open: boolean
    handleCancel: () => void
}

const AgentGatewayRegister = ({
                                  open,
                                  handleCancel,
                              }: Props) => {

    const formRef = useRef<ProFormInstance>();
    let {t} = useTranslation();

    let [param, setParam] = useState<RegisterParam>({
        endpoint: "", token: "", tls: false, download: "",
    });
    let [bash, setBash] = useState('');

    let {message} = App.useApp();

    useEffect(() => {
        if (!open) {
            return;
        }
        agentGatewayApi.getRegisterParam().then(result => {
            setParam(result);
        });
    }, [open]);

    useEffect(() => {
        setBash(`curl -k ${param.download}/api/agent-gateway/install.sh | bash -s ${param.endpoint} ${param.tls} ${param.token}`);
    }, [param]);

    return (
        <Modal
            title={t('gateways.register-agent-gateway')}
            open={open}
            maskClosable={false}
            destroyOnClose={true}
            onOk={() => {
                copy(bash);
                message.success(t('general.copy_success'));
                handleCancel();
            }}
            onCancel={() => {
                formRef.current?.resetFields();
                handleCancel();
            }}
            okText={t('actions.copy')}
        >

            <div className={'mb-2 flex flex-col gap-2'}>
                <div>{t('gateways.rpc-addr')}</div>
                <Input
                    value={param.endpoint}
                    onChange={(e) => {
                        setParam({...param, endpoint: e.target.value});
                    }}
                    onBlur={() => {
                        agentGatewayApi.setRegisterAddr(param.endpoint, param.download);
                    }}
                />
            </div>

            <div className={'mb-2 flex flex-col gap-2'}>
                <div>{t('gateways.download-addr')}</div>
                <Input
                    value={param.download}
                    onChange={(e) => {
                        setParam({...param, download: e.target.value});
                    }}
                    onBlur={() => {
                        agentGatewayApi.setRegisterAddr(param.endpoint, param.download);
                    }}
                />
            </div>

            <div className={clsx('bg-slate-200 p-4 rounded', 'dark:bg-slate-700')}>
                <Paragraph copyable={true} style={{margin: 0}}>
                    {bash}
                </Paragraph>
            </div>

        </Modal>
    );
};

export default AgentGatewayRegister;