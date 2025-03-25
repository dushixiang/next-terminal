import React from 'react';
import {Typography} from "antd";
import {SessionCommand} from "@/src/api/session-api";

interface Props {
    command?: SessionCommand
}

const {Title, Paragraph, Text, Link} = Typography;

const SessionCommandDetail = ({command}: Props) => {
    if (!command) {
        return <div></div>
    }
    return (
        <div>
            <Typography>
                <Title level={4}>Input</Title>
                <Paragraph>
                    <pre>{command?.command}</pre>
                </Paragraph>
                <Title level={4}>Output</Title>
                <Paragraph>
                    <pre style={{maxHeight: 300, overflow: 'auto'}}>{command?.result}</pre>
                </Paragraph>
            </Typography>
        </div>
    );
};

export default SessionCommandDetail;