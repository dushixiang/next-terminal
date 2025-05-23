import React from 'react';
import {HashLoader} from 'react-spinners';
import {ErrorAlert, GuacamoleStatus} from '@/src/pages/access/guacamole/ErrorAlert';
import {useTranslation} from 'react-i18next';

interface Props {
    state?: number;
    status?: GuacamoleStatus;
    onReconnect?: () => void;
}

export const GUACAMOLE_STATE_IDLE = 0;
export const GUACAMOLE_STATE_CONNECTING = 1;
export const GUACAMOLE_STATE_WAITING = 2;
export const GUACAMOLE_STATE_CONNECTED = 3;
export const GUACAMOLE_STATE_DISCONNECTING = 4;
export const GUACAMOLE_STATE_DISCONNECTED = 5;

const RenderState: React.FC<Props> = ({state, status, onReconnect}) => {
    const {t} = useTranslation();
    if (state === GUACAMOLE_STATE_CONNECTED) return null;

    const loading = state !== GUACAMOLE_STATE_DISCONNECTED;
    const labels = {
        STATE_IDLE: t('guacamole.state.idle'),
        STATE_CONNECTING: t('guacamole.state.connecting'),
        STATE_WAITING: t('guacamole.state.waiting'),
        STATE_CONNECTED: t('guacamole.state.connected'),
        STATE_DISCONNECTING: t('guacamole.state.disconnecting'),
        STATE_DISCONNECTED: t('guacamole.state.disconnected'),
    };

    return (
        <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4">
                {loading ? (
                    <div className="flex flex-col gap-4 p-4 text-center items-center">
                        <HashLoader color={'#1568DB'}/>
                        <div>{labels[state!]}</div>
                    </div>
                ) : (
                    <ErrorAlert status={status} onReconnect={onReconnect}/>
                )}
            </div>
        </div>
    );
};

export default RenderState;