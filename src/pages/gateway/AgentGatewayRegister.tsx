import {Input, Modal, Select, Typography} from 'antd';
import React, {useEffect, useState} from 'react';
import agentGatewayApi, {RegisterParam} from "@/api/agent-gateway-api";
import clsx from "clsx";
import {useQuery} from "@tanstack/react-query";
import agentGatewayTokenApi from "@/api/agent-gateway-token-api";
import {baseUrl} from "@/api/core/requests";
import strings from "@/utils/strings";
import {useTranslation} from "react-i18next";

const {Paragraph} = Typography;

interface Props {
    open: boolean
    handleCancel: () => void
}

const linuxImg = new URL('@/assets/images/linux.png', import.meta.url).href;
const windowsImg = new URL('@/assets/images/windows.png', import.meta.url).href;
const macosImg = new URL('@/assets/images/macos.png', import.meta.url).href;

const AgentGatewayRegister = ({
                                  open,
                                  handleCancel,
                              }: Props) => {
    const {t} = useTranslation();

    let [param, setParam] = useState<RegisterParam>({
        endpoint: "", token: ""
    });
    let [os, setOS] = useState('linux');
    let [bash, setBash] = useState('');

    let tokenQuery = useQuery({
        queryKey: ['agent-gateway-tokens'],
        queryFn: agentGatewayTokenApi.getAll,
    });

    let query = useQuery({
        queryKey: ['agent-gateway-register-param'],
        queryFn: agentGatewayApi.getRegisterParam,
        enabled: open,
    });

    useEffect(() => {
        if (query.data) {
            let data = query.data;
            if (data.endpoint === '') {
                data.endpoint = window.location.origin;
                agentGatewayApi.setRegisterAddr(data.endpoint).then(r => {
                    setParam(data);
                });
            } else {
                setParam(data);
            }
        }
    }, [query.data]);

    useEffect(() => {
        if (!open) {
            return;
        }
        tokenQuery.refetch();
    }, [open]);

    useEffect(() => {
        setBash(`curl -k ${param.endpoint}/api/agent/install.sh | bash -s ${param.token}`);
    }, [param]);

    const options = [
        {key: 'linux', label: 'Linux', img: linuxImg},
        {key: 'windows', label: 'Windows', img: windowsImg},
        {key: 'macos', label: 'macOS', img: macosImg},
    ];

    const renderInstallShell = (os: string) => {
        switch (os) {
            case 'linux':
                return <div className={'space-y-2'}>
                    <div className={'font-medium'}>{t('gateways.install_auto')}</div>
                    <div className={clsx('bg-slate-200 p-4 rounded', 'dark:bg-slate-700')}>
                        <Paragraph copyable={true} style={{margin: 0}}>
                            {bash}
                        </Paragraph>
                    </div>
                    <div className={'font-medium mt-4'}>{t('gateways.install_manual')}</div>
                    <div>1. {t('gateways.download_binary')}</div>
                    <div className={'flex items-center gap-2'}>
                        <a href={`${baseUrl()}/agent/downloads/nt-tunnel-linux-amd64`}>amd64</a>
                        <a href={`${baseUrl()}/agent/downloads/nt-tunnel-linux-arm64`}>arm64</a>
                    </div>
                    <div>2. {t('gateways.install_step_rename')}</div>
                    <div className={clsx('bg-slate-200 p-4 rounded', 'dark:bg-slate-700')}>
                        <Paragraph copyable={true} style={{margin: 0}}>
                            {`mv nt-tunnel-linux-amd64 nt-tunnel && chmod +x nt-tunnel`}
                        </Paragraph>
                    </div>
                    <div>3. {t('gateways.install_step_register')}</div>
                    <div className={clsx('bg-slate-200 p-4 rounded', 'dark:bg-slate-700')}>
                        <Paragraph copyable={true} style={{margin: 0}}>
                            {`sudo ./nt-tunnel register --endpoint ${param.endpoint} --token ${param.token} --yes`}
                        </Paragraph>
                    </div>
                </div>;
            case 'windows':
                return <div className={'space-y-2'}>
                    <div>1. {t('gateways.download_binary')}</div>
                    <div>
                        <a href={`${baseUrl()}/agent/downloads/nt-tunnel-windows-amd64.exe`}>amd64</a>
                    </div>
                    <div>2. {t('gateways.install_step_rename_windows')}</div>
                    <div className={clsx('bg-slate-200 p-4 rounded', 'dark:bg-slate-700')}>
                        <Paragraph copyable={true} style={{margin: 0}}>
                            {`ren nt-tunnel-windows-amd64.exe nt-tunnel.exe`}
                        </Paragraph>
                    </div>
                    <div>3. {t('gateways.install_step_register_admin')}</div>
                    <div className={clsx('bg-slate-200 p-4 rounded', 'dark:bg-slate-700')}>
                        <Paragraph copyable={true} style={{margin: 0}}>
                            {`nt-tunnel.exe register --endpoint ${param.endpoint} --token ${param.token} --yes`}
                        </Paragraph>
                    </div>
                    <div className={'text-sm text-gray-500 dark:text-gray-400'}>
                        {t('gateways.install_windows_service_tip')}
                    </div>
                </div>;
            case 'macos':
                return <div className={'space-y-2'}>
                    <div>1. {t('gateways.download_binary')}</div>
                    <div className={'flex items-center gap-2'}>
                        <a href={`${baseUrl()}/agent/downloads/nt-tunnel-darwin-arm64`}>arm64</a>
                        <a href={`${baseUrl()}/agent/downloads/nt-tunnel-darwin-amd64`}>amd64</a>
                    </div>
                    <div>2. {t('gateways.install_step_rename')}</div>
                    <div className={clsx('bg-slate-200 p-4 rounded', 'dark:bg-slate-700')}>
                        <Paragraph copyable={true} style={{margin: 0}}>
                            {`mv nt-tunnel-darwin-arm64 nt-tunnel && chmod +x nt-tunnel`}
                        </Paragraph>
                    </div>
                    <div>3. {t('gateways.install_step_register')}</div>
                    <div className={clsx('bg-slate-200 p-4 rounded', 'dark:bg-slate-700')}>
                        <Paragraph copyable={true} style={{margin: 0}}>
                            {`sudo ./nt-tunnel register --endpoint ${param.endpoint} --token ${param.token} --yes`}
                        </Paragraph>
                    </div>
                    <div className={'text-sm text-gray-500 dark:text-gray-400'}>
                        {t('gateways.install_system_service_tip')}
                    </div>
                </div>;
        }
    }

    function sanitizeBaseUrl(input: string): string | null {
        try {
            const url = new URL(input);
            return `${url.protocol}//${url.host}`;
        } catch (err) {
            return ''; // 非法 URL
        }
    }

    return (
        <Modal
            title={t('gateways.register_title')}
            open={open}
            maskClosable={false}
            destroyOnHidden={true}
            footer={false}
            onCancel={() => {

                handleCancel();
            }}
        >
            <div className={'mb-2 flex flex-col gap-2'}>
                <div>{t('gateways.server_address')}</div>
                <Input
                    value={param.endpoint}
                    onChange={(e) => {
                        setParam({...param, endpoint: e.target.value});
                    }}
                    onBlur={async () => {
                        let endpoint = sanitizeBaseUrl(param.endpoint);
                        if (!strings.hasText(endpoint)) {
                            endpoint = window.location.origin;
                        }
                        setParam({...param, endpoint: endpoint});
                        await agentGatewayApi.setRegisterAddr(endpoint);
                    }}
                />

                <div>{t('gateways.register_token')}</div>
                <Select
                    showSearch
                    placeholder={t('gateways.register_token_placeholder')}
                    filterOption={(input, option) => {
                        const searchText = input.toLowerCase();
                        const optionText = option?.label?.toLowerCase() || '';
                        const optionValue = option?.value?.toLowerCase() || '';
                        return optionText.includes(searchText) || optionValue.includes(searchText);
                    }}
                    options={tokenQuery.data?.map((item) => {
                        return {
                            label: item.id,
                            value: item.id,
                            remark: item.remark,
                        }
                    })}
                    optionRender={(option) => (
                        <div className="flex flex-col py-1">
                            <div className="font-mono text-sm text-gray-800 dark:text-gray-200">
                                {option.data.value}
                            </div>
                            {option.data.remark && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {option.data.remark}
                                </div>
                            )}
                        </div>
                    )}
                    value={param.token}
                    onChange={(value) => {
                        setParam({...param, token: value});
                    }}
                />
            </div>

            <div className={'grid grid-cols-3 p-4'}>
                {options.map((item) => {
                    return (
                        <div className={'flex items-center justify-center cursor-pointer'}
                             onClick={() => {
                                 setOS(item.key);
                             }}
                        >
                            <div className={'space-y-2 text-center'}>
                                <img src={item.img} alt={'linux'} className={'w-16 h-16'}/>
                                <div className={'font-medium'}>{item.label}</div>
                                <div className={clsx('h-1 w-full', os === item.key && 'bg-blue-500')}/>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className={'mt-4 space-y-2'}>
                <div>{t('gateways.install_shell')}</div>
                {renderInstallShell(os)}
            </div>

        </Modal>
    );
};

export default AgentGatewayRegister;
