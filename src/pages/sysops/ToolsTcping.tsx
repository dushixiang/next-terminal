import {Button, Input, InputNumber, Space} from 'antd';
import React, {useState} from 'react';
import {baseUrl, getToken} from "@/src/api/core/requests";

const ToolsTcping = () => {

    let [host, setHost] = useState('');
    let [port, setPort] = useState(22);

    const [logs, setLogs] = useState<string[]>([]);
    const [running, setRunning] = useState(false);
    let eventSource: EventSource | null = null;

    const onSearch = (host: string, port: number) => {
        if (running) return; // 防止重复启动
        setRunning(true);
        setLogs([]);

        eventSource = new EventSource(`${baseUrl()}/admin/tools/tcping?X-Auth-Token=${getToken()}&host=${host}&port=${port}`);

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
            <Space.Compact className={'w-full flex-shrink-0'}>
                <Input value={host}
                       onChange={(e) => setHost(e.target.value)}
                       size={'large'}
                       style={{width: '90%'}}
                       placeholder="Enter IP address"
                />
                <InputNumber
                    value={port}
                    onChange={(value) => setPort(value)}
                    size={'large'}
                    style={{width: '7%'}}
                    min={1}
                    max={65535}
                    precision={0}
                />
                <Button size={'large'} type={'primary'}
                        disabled={!host || !port || running}
                        onClick={() => {
                            onSearch(host, port)
                        }}
                >
                    Ping
                </Button>
            </Space.Compact>

            <div className='border rounded-lg p-4 flex-grow'>
                <pre>{logs.join("\n")}</pre>
            </div>
        </div>
    );
};

export default ToolsTcping;