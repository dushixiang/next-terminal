import React from 'react';
import {useTranslation} from "react-i18next";

const SystemMonitorPage = () => {
    const {t} = useTranslation();

    return (
        <div>
            <div style={{paddingLeft: 24}}>
                {t('sysops.monitoring.todo')}
            </div>
        </div>
    );
};

export default SystemMonitorPage;
