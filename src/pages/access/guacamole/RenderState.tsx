import React from 'react';
import {HashLoader} from 'react-spinners';
import {ErrorAlert, GuacamoleStatus} from '@/pages/access/guacamole/ErrorAlert';
import {useTranslation} from 'react-i18next';
import Guacamole from '@dushixiang/guacamole-common-js';

export enum GuacamoleState {
    IDLE = 0,
    CONNECTING = 1,
    WAITING = 2,
    CONNECTED = 3,
    DISCONNECTING = 4,
    DISCONNECTED = 5,
}

interface RenderStateProps {
    state?: GuacamoleState;
    status?: GuacamoleStatus;
    tunnelState: Guacamole.Tunnel.State;
    onReconnect?: () => void;
    className?: string;
    overlay?: boolean;
}

/**
 * 加载状态组件
 * 显示加载动画和状态文本
 */
const LoadingState: React.FC<{ stateText: string; tunnelText?: string }> = ({stateText, tunnelText}) => (
    <div className="flex flex-col gap-4 p-4 text-center items-center">
        <HashLoader color="#1568DB" size={50}/>
        <div className="text-white text-lg font-medium">
            {stateText}
        </div>
        {tunnelText && (
            <div className="text-sm text-gray-400">
                {tunnelText}
            </div>
        )}
    </div>
);

const RenderState: React.FC<RenderStateProps> = ({
    state,
    status,
    tunnelState,
    onReconnect,
    className = '',
    overlay = true
}) => {
    const {t} = useTranslation();

    const stateLabels: Record<GuacamoleState, string> = {
        [GuacamoleState.IDLE]: t('guacamole.state.idle'),
        [GuacamoleState.CONNECTING]: t('guacamole.state.connecting'),
        [GuacamoleState.WAITING]: t('guacamole.state.waiting'),
        [GuacamoleState.CONNECTED]: t('guacamole.state.connected'),
        [GuacamoleState.DISCONNECTING]: t('guacamole.state.disconnecting'),
        [GuacamoleState.DISCONNECTED]: t('guacamole.state.disconnected'),
    };

    const tunnelLabels: Partial<Record<Guacamole.Tunnel.State, string>> = {
        [Guacamole.Tunnel.State.CONNECTING]: t('guacamole.tunnel.connecting'),
        [Guacamole.Tunnel.State.OPEN]: t('guacamole.tunnel.open'),
        [Guacamole.Tunnel.State.CLOSED]: t('guacamole.tunnel.closed'),
    };

    // 判断是否已成功连接
    const isConnected =
        state === GuacamoleState.CONNECTED && (
            tunnelState === Guacamole.Tunnel.State.OPEN ||
            tunnelState === Guacamole.Tunnel.State.UNSTABLE
        );

    // 判断是否断开连接
    const isDisconnected =
        state === GuacamoleState.DISCONNECTED ||
        tunnelState === Guacamole.Tunnel.State.CLOSED;

    // 判断是否需要显示错误
    const shouldShowError = (status?.code && status.code > 0) || isDisconnected;

    // 如果已连接且状态正常，不显示任何内容
    if (isConnected) {
        return null;
    }

    // 渲染内容
    const renderContent = () => {
        // 显示错误提示
        if (shouldShowError) {
            const displayStatus = status || {
                code: -1,
                message: t('guacamole.state.disconnected'),
            };
            return <ErrorAlert status={displayStatus} onReconnect={onReconnect}/>;
        }

        // 显示加载状态
        const stateText = state !== undefined 
            ? stateLabels[state] || t('guacamole.state.unknown')
            : t('guacamole.state.unknown');
        const tunnelText = tunnelState === Guacamole.Tunnel.State.UNSTABLE
            ? undefined
            : tunnelLabels[tunnelState] || t('guacamole.tunnel.unknown');

        return <LoadingState stateText={stateText} tunnelText={tunnelText}/>;
    };

    const containerClass = overlay
        ? "flex items-center justify-center h-full w-full absolute z-50"
        : "flex items-center justify-center";

    return (
        <div className={`${containerClass} ${className}`}>
            {renderContent()}
        </div>
    );
};

export default RenderState;
