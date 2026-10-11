import {Typography} from 'antd';
import {useTranslation} from 'react-i18next';
import AgentAccess from './AgentAccess';

const AgentAccessPage = ({portal = false}: {portal?: boolean}) => {
    const {t} = useTranslation();
    return <div className={portal ? 'md:px-20 px-4 py-6' : 'py-6'}>
        <Typography.Title level={3} style={{marginTop: 0}}>{t('agent_access.title')}</Typography.Title>
        <AgentAccess portal={portal}/>
    </div>;
};
export default AgentAccessPage;
