import React, {useState} from 'react';
import {ProCard} from "@ant-design/pro-components";
import SessionCommandSummary from "@/src/pages/audit/SessionCommandSummary";
import SessionCommandDetail from "@/src/pages/audit/SessionCommandDetail";
import {SessionCommand} from "@/src/api/session-api";

interface Props {
    open: boolean
    sessionId: string
}

const SessionCommandPage = ({open, sessionId}: Props) => {

    const [command, setCommand] = useState<SessionCommand>();
    return <>
        <ProCard split="vertical">
            <ProCard colSpan="584px" ghost>
                <SessionCommandSummary sessionId={sessionId} onChange={(key) => setCommand(key)}/>
            </ProCard>
            <ProCard>
                <SessionCommandDetail command={command}/>
            </ProCard>
        </ProCard>
    </>
};

export default SessionCommandPage;