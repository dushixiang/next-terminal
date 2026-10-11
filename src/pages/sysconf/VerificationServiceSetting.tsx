import {Tabs} from 'antd';
import {useTranslation} from 'react-i18next';
import {useSearchParams} from 'react-router-dom';
import {SettingProps} from './SettingPage';
import MailSetting from './MailSetting';
import SMSSetting from './SMSSetting';

const VerificationServiceSetting = ({get, set}: SettingProps) => {
    const {t} = useTranslation();
    const [params, setParams] = useSearchParams();
    const selected = params.get('serviceActiveKey') || params.get('integrationActiveKey');
    const activeKey = selected === 'sms' ? 'sms' : 'mail';
    return <div>
        <Tabs activeKey={activeKey}
            onChange={key => setParams({activeKey: 'verification-services', serviceActiveKey: key})}
            items={[
                {key: 'mail', label: t('settings.mail.setting'), children: <MailSetting get={get} set={set}/>},
                {key: 'sms', label: t('settings.sms.title'), children: <SMSSetting get={get} set={set}/>},
            ]}/>
    </div>;
};
export default VerificationServiceSetting;
