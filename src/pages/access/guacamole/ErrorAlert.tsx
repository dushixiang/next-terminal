import React from 'react';
import {useTranslation} from 'react-i18next';
import {XCircle} from 'lucide-react';
import {motion} from 'framer-motion';

export interface GuacamoleStatus {
    code?: number | string;
    message?: string;
}

interface ErrorAlertProps {
    status?: GuacamoleStatus;
    onReconnect?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({status, onReconnect}) => {

    const {t} = useTranslation();

    return (
        <motion.div
            initial={{opacity: 0, scale: 0.9}}
            animate={{opacity: 1, scale: 1}}
            transition={{duration: 0.25, ease: 'easeOut'}}
            className="max-w-md w-[400px] bg-[#1E1E1E] border border-red-600 rounded-2xl p-6 shadow-2xl flex flex-col gap-3"
        >
            <div className="flex items-center gap-2">
                <XCircle className="text-red-500 w-7 h-7 animate-pulse"/>
                <h2 className="text-red-400 text-2xl font-bold leading-snug">
                    {t('access.guacamole.error_title', 'Connection Error')}
                </h2>
            </div>

            {status?.code && (
                <div className="text-sm text-gray-300">
                    <span className="font-semibold">{t('access.guacamole.code', 'Code')}:</span>
                    <span className="ml-1">{status.code}</span>
                </div>
            )}

            {status?.message && (
                <div className="text-sm text-gray-300 break-words">
                    <span className="font-semibold">{t('access.guacamole.message', 'Message')}:</span>
                    <span className="ml-1">{status.message}</span>
                </div>
            )}

            {onReconnect &&
                <button
                    onClick={onReconnect}
                    className="mt-4 self-end bg-gradient-to-tr from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium px-6 py-2 rounded-xl shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                >
                    {t('access.reconnect', 'Reconnect')}
                </button>
            }

        </motion.div>
    );
};
