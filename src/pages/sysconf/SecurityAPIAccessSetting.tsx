import {Button, Form, Switch} from 'antd';
import {useNavigate} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import accountApi from '@/api/account-api';
import {canAccessAgentSettings} from '@/utils/agent-access';
import {useTranslation} from 'react-i18next';
import {useFormRequest} from '@/hook/use-antd-form-query';
import {SettingProps} from './SettingPage';

const SecurityAPIAccessSetting = ({get, set}: SettingProps) => {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const infoQuery = useQuery({queryKey: ['info'], queryFn: accountApi.getUserInfo});
    const canEdit = canAccessAgentSettings(infoQuery.data, 'PUT');
    const [form] = Form.useForm();
    const query = useFormRequest(form, ['form-request', 'api-key-access'], get);
    return <Form form={form} layout="vertical" className="max-w-3xl" onFinish={values => {if (canEdit) return set(values);}}>
        <Form.Item name="api-key-access-enabled" valuePropName="checked" label={t('agent_access.enable_api')} extra={t('agent_access.enable_api_tip')}>
            <Switch disabled={!canEdit || query.isPending || query.isError}/>
        </Form.Item>
        <Button onClick={() => navigate('/agent-access')} style={{marginRight: 12}}>{t('agent_access.view_guide')}</Button>
        {canEdit && <Button type="primary" htmlType="submit" disabled={!canEdit || query.isPending || query.isError}>{t('actions.save')}</Button>}
    </Form>;
};
export default SecurityAPIAccessSetting;
