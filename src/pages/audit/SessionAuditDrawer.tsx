import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer, Spin, Typography } from 'antd';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useQuery } from '@tanstack/react-query';
import sessionApi, { SessionAudit } from '@/api/session-api';

interface SessionAuditDrawerProps {
    open: boolean;
    sessionId: string;
    onClose: () => void;
}

const SessionAuditDrawer: React.FC<SessionAuditDrawerProps> = ({ open, sessionId, onClose }) => {
    const { t } = useTranslation();
    const [auditData, setAuditData] = useState<SessionAudit | null>(null);

    // 打开时拉取已有审计结果
    const { isLoading } = useQuery({
        queryKey: ['session-audit-view', sessionId],
        queryFn: async () => {
            const data = await sessionApi.getAudit(sessionId);
            setAuditData(data);
            return data;
        },
        enabled: open && !!sessionId,
        staleTime: 0,
    });

    useEffect(() => {
        if (!open) setAuditData(null);
    }, [open]);

    const renderContent = () => {
        if (isLoading || !auditData) {
            return (
                <div className="flex items-center justify-center h-40">
                    <Spin />
                </div>
            );
        }
        if (auditData.status === 'failed') {
            return (
                <Typography.Text type="danger">
                    {auditData.error || t('audit.audit_failed')}
                </Typography.Text>
            );
        }
        if (auditData.status === 'pending') {
            return (
                <div className="flex items-center justify-center h-40">
                    <Spin description={t('audit.audit_analyzing')} />
                </div>
            );
        }

        const html = DOMPurify.sanitize(marked(auditData.content || '') as string);
        return (
            <div
                className="markdown-body"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        );
    };

    return (
        <Drawer
            title={t('audit.options.audit')}
            placement="right"
            size={window.innerWidth * 0.8}
            onClose={onClose}
            open={open}
            destroyOnHidden={true}
        >
            {renderContent()}
        </Drawer>
    );
};

export default SessionAuditDrawer;
