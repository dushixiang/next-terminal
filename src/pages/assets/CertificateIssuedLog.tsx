import React, {useEffect, useRef, useState} from 'react';
import {Drawer} from "antd";
import {baseUrl, getToken} from "@/src/api/core/requests";
import {useTranslation} from "react-i18next";

interface Props {
    open: boolean;
    onClose: () => void
}

const CertificateIssuedLog = ({open, onClose}: Props) => {

    let {t} = useTranslation();
    const [logs, setLogs] = useState([]);
    const bottomRef = useRef(null);

    useEffect(() => {
        if (!open) {
            return;
        }
        const eventSource = new EventSource(`${baseUrl()}/admin/certificates/issued/log?X-Auth-Token=${getToken()}`);

        eventSource.onmessage = (event) => {
            setLogs((prevLogs) => [...prevLogs, event.data]);
        };

        eventSource.onerror = (err) => {
            console.error("SSE connection error:", err);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [open]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({behavior: "smooth"});
    }, [logs]);


    return (
        <Drawer title={t('assets.certificates.issued_log')}
                onClose={onClose}
                open={open}
                width={window.innerWidth * 0.8}
        >
            <div
                style={{
                    backgroundColor: "#111",
                    color: "#0f0",
                    fontFamily: "monospace",
                    padding: "1rem",
                    height: "85vh",
                    overflowY: "auto",
                    border: "1px solid #444",
                    borderRadius: "6px"
                }}
            >
                {logs.map((log, idx) => (
                    <div key={idx}>{log}</div>
                ))}
                <div ref={bottomRef}/>
            </div>
        </Drawer>
    );
};

export default CertificateIssuedLog;