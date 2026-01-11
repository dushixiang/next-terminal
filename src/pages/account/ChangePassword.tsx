import React, {useState} from 'react';
import {Button, Form, Input, message, Typography} from "antd";
import accountApi from "../../api/account-api";
import {ValidateStatus} from "antd/es/form/FormItem";
import {useTranslation} from "react-i18next";
import {useQuery} from "@tanstack/react-query";
import {getCurrentUser} from "@/utils/permission";
import {EyeInvisibleOutlined, EyeTwoTone} from '@ant-design/icons';

const {Title} = Typography;

const ChangePassword = () => {

    let {t} = useTranslation();
    let [newPassword1, setNewPassword1] = useState('');
    let [newPassword2, setNewPassword2] = useState('');
    let [newPasswordStatus, setNewPasswordStatus] = useState<ValidateStatus>();
    let [error, setError] = useState<string>('');

    let passwordPolicyQuery = useQuery({
        queryKey: ['get-password-policy'],
        queryFn: accountApi.getPasswordPolicy,
    });

    /**
     * @param newPassword
     */
    const passwordPolicyCheck = (newPassword: string) => {
        let policy = passwordPolicyQuery.data;
        if (!policy) {
            return '';
        }
        if (newPassword.length < policy.minLength) {
            return t('settings.security.password.too_short') + policy.minLength;
        }
        if (policy.minCharacterType > 0) {
            let characterType = 0;
            if (newPassword.match(/[0-9]/)) {
                characterType++;
            }
            if (newPassword.match(/[a-z]/)) {
                characterType++;
            }
            if (newPassword.match(/[A-Z]/)) {
                characterType++;
            }
            if (newPassword.match(`[~!@#$%^&*()_+-={}[]|:;"'<>,.?/]`)) {
                characterType++;
            }
            if (characterType < policy.minCharacterType) {
                return `密码需包含大写字母、小写字母、数字、特殊字符中的至少 ${policy.minCharacterType} 种`;
            }
        }
        let user = getCurrentUser();
        if (policy.mustNotContainUsername && newPassword.includes(user.username)) {
            return t('settings.security.password.cannot_contain_username');
        }

        // 判断一个字符串是否是回文
        function isPalindrome(s: string): boolean {
            console.log(`s`, s)
            for (let i = 0; i < s.length / 2; i++) {
                if (s[i] !== s[s.length - i - 1]) {
                    return false;
                }
            }
            return true;
        }

        console.log(`policy.mustNotContainPalindrome`, policy.mustNotBePalindrome)
        console.log(`policy.mustNotContainPalindrome`, policy.mustNotBePalindrome && isPalindrome(newPassword))
        if (policy.mustNotBePalindrome && isPalindrome(newPassword)) {
            return t('settings.security.password.cannot_be_palindrome');
        }
        return '';
    }

    const onNewPasswordChange = async (event: any) => {
        // let result = await accountApi.passwordPolicyCheck({
        //     'newPassword': event.target.value,
        // });
        // console.log(`passwordPolicyCheck: ${result}`)

        setNewPassword1(event.target.value);
        setNewPasswordStatus(validateNewPassword(event.target.value, newPassword2));

        let error = passwordPolicyCheck(event.target.value);
        setError(error);
    }

    const onNewPassword2Change = (value: any) => {
        setNewPassword2(value.target.value);
        setNewPasswordStatus(validateNewPassword(newPassword1, value.target.value));
    }

    const validateNewPassword = (newPassword1: string, newPassword2: string) => {
        if (newPassword2 === newPassword1) {
            return 'success';
        }
        return 'error';
    }

    const changePassword = async (values: any) => {
        await accountApi.changePassword(values);
        message.success('success');
        window.location.href = '/'
    }

    return (
        <div>
            <Title level={5} style={{marginTop: 0}}>{t('account.change.password')}</Title>
            <div style={{margin: 16}}></div>
            <Form name="password"
                  onFinish={changePassword}
                  layout={'vertical'}
            >
                <input type='password' hidden={true} autoComplete='new-password'/>
                <Form.Item
                    name="oldPassword"
                    label={t('account.old_password')}
                    rules={[
                        {
                            required: true,
                        },
                    ]}
                >
                    <Input type='password' style={{width: 240}} placeholder={t('account.enter')}/>
                </Form.Item>
                <Form.Item
                    name="newPassword"
                    label={t('account.new_password')}
                    rules={[
                        {
                            required: true,
                        },
                    ]}
                    validateStatus={error != '' ? 'error' : 'success'}
                    help={error}
                >
                    <Input.Password
                        showCount
                        iconRender={(visible) => (visible ? <EyeTwoTone/> : <EyeInvisibleOutlined/>)}
                        onChange={(value) => onNewPasswordChange(value)}
                        style={{width: 240}}
                        placeholder={t('account.enter')}
                    />
                </Form.Item>
                <Form.Item
                    name="newPassword2"
                    label={t('account.confirm_password')}
                    rules={[
                        {
                            required: true,
                        },
                    ]}
                    validateStatus={newPasswordStatus}
                >
                    <Input.Password
                        showCount
                        iconRender={(visible) => (visible ? <EyeTwoTone/> : <EyeInvisibleOutlined/>)}
                        onChange={(value) => onNewPassword2Change(value)}
                        style={{width: 240}}
                        placeholder={t('account.enter')}
                    />
                </Form.Item>
                <Form.Item>
                    <Button disabled={newPasswordStatus !== 'success' || error !== ''}
                            type="primary"
                            htmlType="submit">
                        {t('account.submit')}
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
};

export default ChangePassword;