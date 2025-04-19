import {Button, Form, Input, InputNumber} from 'antd';
import React, {useState} from 'react';
import {baseUrl, getToken} from "@/src/api/core/requests";
import {useTranslation} from "react-i18next";

const ToolsPing = () => {

    let {t} = useTranslation();
    const [host, setHost] = useState("");
    const [attempts, setAttempts] = useState<number>(4);
    const [logs, setLogs] = useState<string[]>([]);
    const [running, setRunning] = useState(false);
    let eventSource: EventSource | null = null;

    const onSearch = (host: string) => {
        if (running) return;
        setRunning(true);
        setLogs([]);

        eventSource = new EventSource(`${baseUrl()}/admin/tools/ping?X-Auth-Token=${getToken()}&host=${host}&attempts=${attempts}`);

        eventSource.onmessage = (event) => {
            setLogs((prevLogs) => [...prevLogs, event.data]);
        };

        eventSource.onerror = () => {
            eventSource?.close();
            setRunning(false);
        };
    }

    return (
        <div className={'space-y-4 flex flex-col min-h-[75vh]'}>
            <Form layout="inline" className="w-full">
                <Form.Item
                    label={t('sysops.tools.target')}
                >
                    <Input
                        value={host}
                        onChange={(e) => setHost(e.target.value)}
                        placeholder={t('sysops.tools.target_placeholder')}
                        style={{
                            width: '200px'
                        }}
                    />
                </Form.Item>
                <Form.Item
                    label={t('sysops.tools.attempts')}
                    tooltip={t('sysops.tools.attempts_tips')}
                >
                    <InputNumber
                        value={attempts}
                        onChange={(value) => setAttempts(value || 4)}
                        min={1}
                        max={100}
                        style={{width: '100px'}}
                    />
                </Form.Item>
                <Form.Item>
                    <Button
                        type={'primary'}
                        disabled={!host || running}
                        onClick={() => onSearch(host)}
                    >
                        {t('sysops.tools.testing')}
                    </Button>
                </Form.Item>
            </Form>

            <div className='border rounded-lg p-4 flex-grow'>
                <pre>{logs.join("\n")}</pre>
            </div>
        </div>
    );
};

export default ToolsPing;