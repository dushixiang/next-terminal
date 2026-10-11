import {Button, Form, InputNumber, Radio, Space, Switch} from "antd";
import {useTranslation} from "react-i18next";
import {useFormRequest} from "@/hook/use-antd-form-query";
import {SettingProps} from "./SettingPage";

const SecurityPasswordPolicySetting = ({
                                           get,
                                           set
                                       }: SettingProps) => {
    const {t} = useTranslation();
    const [form] = Form.useForm();

    const wrapGet = async () => {
        const values = await get();
        values['password-strength'] = JSON.parse(values['password-strength-policy'] || '{}');
        return values;
    };

    const wrapSet = async (values: any) => {
        const ps = values['password-strength'];
        if (ps) {
            delete values['password-strength'];
            values['password-strength-policy'] = JSON.stringify(ps);
        }
        return await set(values);
    };

    useFormRequest(form, ["form-request", "web/src/pages/sysconf/SecurityPasswordPolicySetting.tsx"], wrapGet, true);

    return <Form form={form} onFinish={wrapSet} layout="vertical">
        <Form.Item label={t('settings.security.password.expiration_period')}
                   tooltip={t('general.less-zero-tip')} required={true}>
            <Space.Compact block>
                <Form.Item name="password-expiration-period" noStyle>
                    <InputNumber precision={0} min={-1}/>
                </Form.Item>
                <Space.Addon>{t('general.days')}</Space.Addon>
            </Space.Compact>
        </Form.Item>

        <Form.Item label={t('settings.security.password.complexity')} name="password-strength-type">
            <Radio.Group options={[{
                label: t('settings.security.password.recommend'),
                value: 'recommend'
            }, {
                label: t('settings.security.password.customize'),
                value: 'customize'
            }]}/>
        </Form.Item>
        <Form.Item noStyle={true} shouldUpdate={true}>
            {form => {
                if (form.getFieldValue('password-strength-type') !== 'customize') {
                    return null;
                }
                return <div className="rounded-md p-4 bg-gray-50 mt-4 dark:bg-[#141414]">
                    <Form.Item
                        label={t('settings.security.password.min_length')} required>
                        <Space.Compact block>
                            <Form.Item name={["password-strength", "minLength"]} noStyle>
                                <InputNumber min={1}/>
                            </Form.Item>
                            <Space.Addon>{t('settings.security.password.character')}</Space.Addon>
                        </Space.Compact>
                    </Form.Item>
                    <Form.Item
                        label={t('settings.security.password.min_character_types')}
                        extra={t('settings.security.password.character_types_tip')} required>
                        <Space.Compact block>
                            <Form.Item name={["password-strength", "minCharacterType"]} noStyle>
                                <InputNumber min={1} max={3}/>
                            </Form.Item>
                            <Space.Addon>{t('settings.security.password.character_type_unit')}</Space.Addon>
                        </Space.Compact>
                    </Form.Item>
                    <Form.Item name={['password-strength', "mustNotContainUsername"]}
                               label={t("settings.security.password.cannot_contain_username")} valuePropName="checked">
                        <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
                    </Form.Item>
                    <Form.Item name={['password-strength', "mustNotBePalindrome"]}
                               label={t("settings.security.password.cannot_be_palindrome")} valuePropName="checked">
                        <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
                    </Form.Item>
                    <Form.Item name={['password-strength', "mustNotWeak"]}
                               label={t("settings.security.password.cannot_be_weak")} valuePropName="checked">
                        <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
                    </Form.Item>
                </div>;
            }}
        </Form.Item>

        <Form.Item>
            <Button type="primary" htmlType="submit">{t("actions.save")}</Button>
        </Form.Item>
    </Form>;
};

export default SecurityPasswordPolicySetting;
