import {Button, Input, Space} from 'antd';
import React, {useState} from 'react';
import {baseUrl, getToken} from "@/src/api/core/requests";

const ToolsPing = () => {

    const [host, setHost] = useState("");
    const [logs, setLogs] = useState<string[]>([]);
    const [running, setRunning] = useState(false);
    let eventSource: EventSource | null = null;

    const onSearch = (host: string) => {
        if (running) return; // 防止重复启动
        setRunning(true);
        setLogs([]);

        eventSource = new EventSource(`${baseUrl()}/admin/tools/ping?X-Auth-Token=${getToken()}&host=${host}`);

        eventSource.onmessage = (event) => {
            setLogs((prevLogs) => [...prevLogs, event.data]);
        };

        eventSource.onerror = () => {
            // setLogs((prevLogs) => [...prevLogs, "Connection closed."]);
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
                       // style={{width: '90%'}}
                       placeholder="Enter IP address"
                />
                <Button size={'large'} type={'primary'}
                        disabled={!host || running}
                        onClick={() => {
                            onSearch(host)
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

export default ToolsPing;