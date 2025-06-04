import React from 'react';
import {HashLoader} from 'react-spinners';
import {ErrorAlert, GuacamoleStatus} from '@/src/pages/access/guacamole/ErrorAlert';
import {useTranslation} from 'react-i18next';
// @ts-ignore
import Guacamole from '@dushixiang/guacamole-common-js';

export enum GuacamoleState {
    IDLE = 0,
    CONNECTING = 1,
    WAITING = 2,
    CONNECTED = 3,
    DISCONNECTING = 4,
    DISCONNECTED = 5,
}

interface Props {
    state?: GuacamoleState;
    status?: GuacamoleStatus;
    tunnelState: Guacamole.Tunnel.State;
    onReconnect?: () => void;
}

const RenderState: React.FC<Props> = ({state, status, tunnelState, onReconnect}) => {
    const {t} = useTranslation();

    const stateLabels: Record<GuacamoleState, string> = {
        [GuacamoleState.IDLE]: t('guacamole.state.idle'),
        [GuacamoleState.CONNECTING]: t('guacamole.state.connecting'),
        [GuacamoleState.WAITING]: t('guacamole.state.waiting'),
        [GuacamoleState.CONNECTED]: t('guacamole.state.connected'),
        [GuacamoleState.DISCONNECTING]: t('guacamole.state.disconnecting'),
        [GuacamoleState.DISCONNECTED]: t('guacamole.state.disconnected'),
    };

    const tunnelLabels: Record<Guacamole.Tunnel.State, string> = {
        [Guacamole.Tunnel.State.CONNECTING]: t('guacamole.tunnel.connecting'),
        [Guacamole.Tunnel.State.OPEN]: t('guacamole.tunnel.open'),
        [Guacamole.Tunnel.State.CLOSED]: t('guacamole.tunnel.closed'),
        [Guacamole.Tunnel.State.UNSTABLE]: t('guacamole.tunnel.unstable'),
    };

    if (state === GuacamoleState.CONNECTED && tunnelState === Guacamole.Tunnel.State.OPEN) {
        return null;
    }

    const render = () => {
        if (state === GuacamoleState.DISCONNECTED || tunnelState === Guacamole.Tunnel.State.CLOSED) {
            if(!status){
                status = {
                    code: -1,
                    message: t('guacamole.state.disconnected'),
                }
            }
            return <ErrorAlert status={status} onReconnect={onReconnect}/>;
        }
        return <div className="flex flex-col gap-4 p-4 text-center items-center">
            <HashLoader color="#1568DB"/>
            <div>{state !== undefined ? stateLabels[state] : t('guacamole.state.unknown')}</div>
            <div className="text-sm text-gray-500">{tunnelLabels[tunnelState]}</div>
        </div>;
    }

    return (
        <div className="flex items-center justify-center h-full w-full absolute z-50">
            <div className="flex flex-col items-center gap-4">
                {render()}
            </div>
        </div>
    );
};

export default RenderState;
