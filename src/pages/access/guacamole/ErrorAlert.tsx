import React from 'react';
import {useTranslation} from 'react-i18next';
import {XCircle} from 'lucide-react';

export interface GuacamoleStatus {
    code?: number;
    message?: string;
}

interface ErrorAlertProps {
    status?: GuacamoleStatus;
    onReconnect?: () => void;
}

/**
 * 错误详情行组件
 */
const ErrorDetail: React.FC<{ label: string; value: string | number }> = ({label, value}) => (
    <div className="text-sm text-gray-300">
        <span className="font-semibold">{label}:</span>
        <span className="ml-1">{value}</span>
    </div>
);

/**
 * Guacamole 连接错误提示组件
 * 显示连接错误信息和重连按钮
 */
export const ErrorAlert: React.FC<ErrorAlertProps> = ({status, onReconnect}) => {
    const {t} = useTranslation();

    const hasCode = status?.code !== undefined && status.code !== null;
    const hasMessage = status?.message && status.message.trim() !== '';

    return (
        <div className="max-w-md w-[400px] bg-[#1E1E1E] border border-red-600 rounded-2xl p-6 shadow-2xl flex flex-col gap-3">
            {/* 错误标题 */}
            <div className="flex items-center gap-2">
                <XCircle className="text-red-500 w-7 h-7 animate-pulse"/>
                <h2 className="text-red-400 text-2xl font-bold leading-snug">
                    {t('access.guacamole.error_title', 'Connection Error')}
                </h2>
            </div>

            {/* 错误详情 */}
            {hasCode && (
                <ErrorDetail
                    label={t('access.guacamole.code', 'Code')}
                    value={status.code!}
                />
            )}

            {hasMessage && (
                <div className="text-sm text-gray-300 break-words">
                    <span className="font-semibold">{t('access.guacamole.message', 'Message')}:</span>
                    <span className="ml-1">{status.message!}</span>
                </div>
            )}

            {/* 重连按钮 */}
            {onReconnect && (
                <button
                    onClick={onReconnect}
                    className="mt-4 self-end bg-gradient-to-tr from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium px-6 py-2 rounded-xl shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                >
                    {t('assets.resize_methods.reconnect', 'Reconnect')}
                </button>
            )}
        </div>
    );
};