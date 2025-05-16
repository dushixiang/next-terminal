import React from 'react';
import Guacamole from '@dushixiang/guacamole-common-js';
import {HashLoader} from 'react-spinners';
import {ErrorAlert} from '@/src/pages/access/guacamole/ErrorAlert';
import {useTranslation} from 'react-i18next';

interface Props {
    state?: Guacamole.Client.State;
    status?: Guacamole.Status;
    onReconnect: () => void;
}

const RenderState: React.FC<Props> = ({state, status, onReconnect}) => {
    const {t} = useTranslation();
    if (state === Guacamole.Client.State.CONNECTED) return null;

    const loading = state !== Guacamole.Client.State.DISCONNECTED;
    const labels = {
        [Guacamole.Client.State.IDLE]: t('guacamole.state.idle'),
        [Guacamole.Client.State.CONNECTING]: t('guacamole.state.connecting'),
        [Guacamole.Client.State.WAITING]: t('guacamole.state.waiting'),
        [Guacamole.Client.State.DISCONNECTED]: t('guacamole.state.disconnected'),
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
                    <ErrorAlert status={status} onReconnect={onReconnect} />
                )}
            </div>
        </div>
    );
};

export default RenderState;