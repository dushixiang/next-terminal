import React, {useEffect, useRef, useState} from 'react';
import {Button, Drawer, Space, Tooltip, Typography} from "antd";
import {DownloadOutlined, PauseOutlined, PlayCircleOutlined} from "@ant-design/icons";
import {baseUrl, getToken} from "@/api/core/requests";
import {useTranslation} from "react-i18next";

const {Text} = Typography;

interface Props {
    open: boolean;
    onClose: () => void
}

interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    raw: string;
}

const CertificateIssuedLog = ({open, onClose}: Props) => {

    let {t} = useTranslation();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const [autoScroll, setAutoScroll] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);
    const logContainerRef = useRef<HTMLDivElement>(null);

    // 解析日志条目
    const parseLogEntry = (logText: string): LogEntry => {
        try {
            const logObj = JSON.parse(logText);
            
            // 构建消息内容
            let message = logObj.msg || '';
            
            // 添加logger信息（如果存在）
            if (logObj.logger && logObj.logger !== 'default') {
                message = `[${logObj.logger}] ${message}`;
            }
            
            // 添加其他有用的字段
            const extraFields = [];
            if (logObj.identifier) extraFields.push(`identifier=${logObj.identifier}`);
            if (logObj.challenge_type) extraFields.push(`challenge_type=${logObj.challenge_type}`);
            if (logObj.ca) extraFields.push(`ca=${logObj.ca}`);
            if (logObj.account) extraFields.push(`account=${logObj.account}`);
            if (logObj.status_code) extraFields.push(`status=${logObj.status_code}`);
            if (logObj.method) extraFields.push(`method=${logObj.method}`);
            if (logObj.url) extraFields.push(`url=${logObj.url}`);
            if (logObj.error) extraFields.push(`error=${logObj.error}`);
            if (logObj.count) extraFields.push(`count=${logObj.count}`);
            if (logObj.names && Array.isArray(logObj.names)) extraFields.push(`names=[${logObj.names.join(', ')}]`);
            
            if (extraFields.length > 0) {
                message += ` (${extraFields.join(', ')})`;
            }
            
            return {
                timestamp: logObj.time || new Date().toISOString(),
                level: (logObj.level || 'INFO').toUpperCase(),
                message: message || logText,
                raw: logText
            };
        } catch {
            // 如果不是JSON格式，尝试解析普通格式
            const match = logText.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s+(\w+)\s+(.+)/);
            if (match) {
                return {
                    timestamp: match[1],
                    level: match[2].toUpperCase(),
                    message: match[3],
                    raw: logText
                };
            }
            return {
                timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
                level: 'INFO',
                message: logText,
                raw: logText
            };
        }
    };

    // 获取日志级别颜色
    const getLogLevelColor = (level: string) => {
        switch (level.toUpperCase()) {
            case 'ERROR':
                return '#ff4d4f';
            case 'WARN':
            case 'WARNING':
                return '#faad14';
            case 'INFO':
                return '#1890ff';
            case 'DEBUG':
                return '#52c41a';
            default:
                return '#d9d9d9';
        }
    };

    // 获取日志级别标识
    const getLogLevelIcon = (level: string) => {
        switch (level.toUpperCase()) {
            case 'ERROR':
                return 'ERR';
            case 'WARN':
            case 'WARNING':
                return 'WRN';
            case 'INFO':
                return 'INF';
            case 'DEBUG':
                return 'DBG';
            default:
                return 'LOG';
        }
    };

    useEffect(() => {
        if (!open) {
            return;
        }
        const eventSource = new EventSource(`${baseUrl()}/admin/certificates/issued/log?X-Auth-Token=${getToken()}`);

        eventSource.onmessage = (event) => {
            if (!isPaused) {
                const logEntry = parseLogEntry(event.data);
                setLogs((prevLogs) => [...prevLogs, logEntry]);
            }
        };

        eventSource.onerror = (err) => {
            console.error("SSE connection error:", err);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [open, isPaused]);

    useEffect(() => {
        if (autoScroll && !isPaused) {
            bottomRef.current?.scrollIntoView({behavior: "smooth"});
        }
    }, [logs, autoScroll, isPaused]);

    // 检测用户是否手动滚动
    const handleScroll = () => {
        if (logContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
            const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
            setAutoScroll(isAtBottom);
        }
    };

    // 清空日志（仅清空前端显示）
    const clearLogs = () => {
        setLogs([]);
    };

    // 下载日志
    const downloadLogs = () => {
        const logContent = logs.map(log => log.raw).join('\n');
        const blob = new Blob([logContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificate-logs-${new Date().toISOString().split('T')[0]}.log`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // 切换暂停/继续
    const togglePause = () => {
        setIsPaused(!isPaused);
    };


    return (
        <Drawer 
            title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{t('assets.certificates.issued_log')}</span>
                    <Space>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            {logs.length} {t('assets.certificates.log_viewer.stats.total_logs')}
                        </Text>
                        <Tooltip title={isPaused ? t('assets.certificates.log_viewer.actions.resume') : t('assets.certificates.log_viewer.actions.pause')}>
                            <Button 
                                size="small" 
                                icon={isPaused ? <PlayCircleOutlined /> : <PauseOutlined />}
                                onClick={togglePause}
                                type={isPaused ? "primary" : "default"}
                            />
                        </Tooltip>
                        <Tooltip title={t('assets.certificates.log_viewer.actions.download')}>
                            <Button 
                                size="small" 
                                icon={<DownloadOutlined />}
                                onClick={downloadLogs}
                                disabled={logs.length === 0}
                            />
                        </Tooltip>
                    </Space>
                </div>
            }
            onClose={onClose}
            open={open}
            width={window.innerWidth * 0.85}
            styles={{
                body: { padding: 0 }
            }}
        >
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* 状态栏 */}
                <div style={{
                    padding: '8px 16px',
                    backgroundColor: '#f5f5f5',
                    borderBottom: '1px solid #d9d9d9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Space>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            {t('general.status')}: {isPaused ? 
                                <Text type="warning">{t('assets.certificates.log_viewer.status.paused')}</Text> : 
                                <Text type="success">{t('assets.certificates.log_viewer.status.realtime')}</Text>
                            }
                        </Text>
                        {!autoScroll && (
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                {t('assets.certificates.log_viewer.stats.auto_scroll')}: <Text type="warning">{t('assets.certificates.log_viewer.status.auto_scroll_disabled')}</Text>
                            </Text>
                        )}
                    </Space>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        {t('assets.certificates.log_viewer.stats.last_update')}: {logs.length > 0 ? logs[logs.length - 1].timestamp : t('general.no')}
                    </Text>
                </div>

                {/* 日志内容 */}
                <div
                    ref={logContainerRef}
                    onScroll={handleScroll}
                    style={{
                        flex: 1,
                        backgroundColor: "#0d1117",
                        color: "#c9d1d9",
                        fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
                        fontSize: "13px",
                        lineHeight: "1.5",
                        padding: "12px",
                        overflowY: "auto",
                        overflowX: "hidden"
                    }}
                >
                    {logs.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            color: '#8b949e',
                            marginTop: '50px'
                        }}>
                            <div style={{ fontSize: '24px', marginBottom: '16px', fontWeight: 'bold' }}>LOG</div>
                            <div>{t('assets.certificates.log_viewer.stats.no_data')}</div>
                            <div style={{ fontSize: '12px', marginTop: '8px' }}>
                                {t('assets.certificates.log_viewer.stats.no_data_desc')}
                            </div>
                        </div>
                    ) : (
                        logs.map((log, idx) => (
                            <div 
                                key={idx} 
                                style={{
                                    marginBottom: '2px',
                                    padding: '4px 6px',
                                    borderRadius: '3px',
                                    backgroundColor: log.level === 'ERROR' ? 'rgba(248, 81, 73, 0.1)' :
                                                   log.level === 'WARN' || log.level === 'WARNING' ? 'rgba(250, 173, 20, 0.1)' :
                                                   'transparent',
                                    borderLeft: `3px solid ${getLogLevelColor(log.level)}`,
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'flex-start',
                                    gap: '6px'
                                }}>
                                    <span style={{ 
                                        color: getLogLevelColor(log.level),
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        minWidth: '28px',
                                        textAlign: 'center',
                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                        borderRadius: '2px',
                                        padding: '1px 2px'
                                    }}>
                                        {getLogLevelIcon(log.level)}
                                    </span>
                                    <span style={{ 
                                        color: '#8b949e',
                                        fontSize: '11px',
                                        minWidth: '140px',
                                        fontFamily: 'monospace'
                                    }}>
                                        {log.timestamp}
                                    </span>
                                    <span style={{ 
                                        flex: 1,
                                        wordBreak: 'break-word',
                                        whiteSpace: 'pre-wrap',
                                        lineHeight: '1.4'
                                    }}>
                                        {log.message}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={bottomRef}/>
                </div>

                {/* 底部工具栏 */}
                {logs.length > 0 && (
                    <div style={{
                        padding: '8px 16px',
                        backgroundColor: '#f5f5f5',
                        borderTop: '1px solid #d9d9d9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <Space>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                {t('assets.certificates.log_viewer.stats.errors')}: {logs.filter(log => log.level === 'ERROR').length}
                            </Text>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                {t('assets.certificates.log_viewer.stats.warnings')}: {logs.filter(log => log.level === 'WARN' || log.level === 'WARNING').length}
                            </Text>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                {t('assets.certificates.log_viewer.stats.info')}: {logs.filter(log => log.level === 'INFO').length}
                            </Text>
                        </Space>
                        {!autoScroll && (
                            <Button 
                                size="small" 
                                type="link"
                                onClick={() => {
                                    setAutoScroll(true);
                                    bottomRef.current?.scrollIntoView({behavior: "smooth"});
                                }}
                            >
                                {t('assets.certificates.log_viewer.actions.scroll_to_bottom')}
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </Drawer>
    );
};

export default CertificateIssuedLog;