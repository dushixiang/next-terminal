import {App, Input, Modal, Select, Typography} from 'antd';
import React, {useEffect, useRef, useState} from 'react';
import {ProFormInstance} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import agentGatewayApi, {RegisterParam} from "@/src/api/agent-gateway-api";
import copy from "copy-to-clipboard";
import clsx from "clsx";
import {useQuery} from "@tanstack/react-query";
import agentGatewayTokenApi from "@/src/api/agent-gateway-token-api";

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
        endpoint: "", token: ""
    });
    let [bash, setBash] = useState('');

    let {message} = App.useApp();

    let tokenQuery = useQuery({
        queryKey: ['agent-gateway-tokens'],
        queryFn: agentGatewayTokenApi.getAll,
    });

    useEffect(() => {
        if (!open) {
            return;
        }
        tokenQuery.refetch();
        agentGatewayApi.getRegisterParam().then(result => {
            setParam(result);
        });
    }, [open]);

    useEffect(() => {
        setBash(`curl -k ${param.endpoint}/api/agent-gateway/install.sh | bash ${param.token}`);
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
                <div>{t('gateways.endpoint')}</div>
                <Input
                    value={param.endpoint}
                    onChange={(e) => {
                        setParam({...param, endpoint: e.target.value});
                    }}
                    onBlur={() => {
                        agentGatewayApi.setRegisterAddr(param.endpoint);
                    }}
                />

                <div>{t('gateways.token')}</div>
                <Select
                    showSearch
                    filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={tokenQuery.data?.map((item) => {
                        return {
                            label: item.id,
                            value: item.id,
                        }
                    })}
                    value={param.token}
                    onChange={(value) => {
                        setParam({...param, token: value});
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