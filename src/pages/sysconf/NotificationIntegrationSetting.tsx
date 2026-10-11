import {Tabs} from "antd";
import {useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import NotificationChannels from "./notification-integration/NotificationChannels";
import NotificationRules from "./notification-integration/NotificationRules";
import NotificationDeliveries from "./notification-integration/NotificationDeliveries";

import ApprovalNotifications from "./notification-integration/ApprovalNotifications";

const NotificationIntegrationSetting = () => {
    const {t} = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const selected = searchParams.get('integrationActiveKey');
    const activeKey = selected && ['channels', 'approval', 'rules', 'deliveries'].includes(selected) ? selected : 'channels';

    const handleTabChange = (key: string) => {
        setSearchParams({'activeKey': 'notification-integration', 'integrationActiveKey': key});
    };

    return <Tabs
        activeKey={activeKey}
        onChange={handleTabChange}
        items={[
            {
                label: t('settings.notification.channels'),
                key: 'channels',
                children: <NotificationChannels/>
            },
            {
                label: t('settings.notification.approval_title'),
                key: 'approval',
                children: <ApprovalNotifications/>
            },
            {
                label: t('settings.notification.rules'),
                key: 'rules',
                children: <NotificationRules/>
            },
            {
                label: t('settings.notification.deliveries'),
                key: 'deliveries',
                children: <NotificationDeliveries/>
            }
        ]}
    />;
};

export default NotificationIntegrationSetting;
