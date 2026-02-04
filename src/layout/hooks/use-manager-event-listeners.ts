import {useEffect} from 'react';
import {Modal} from 'antd';
import {useTranslation} from 'react-i18next';
import eventEmitter from '@/api/core/event-emitter.ts';
import {debounce} from '@/utils/debounce.ts';

/**
 * 管理端事件监听 Hook
 * 监听 OTP 启用和密码过期事件
 */
export function useManagerEventListeners() {
    const {t} = useTranslation();
    const [modal, contextHolder] = Modal.useModal();

    useEffect(() => {
        // OTP 启用提醒
        const needEnableOTP = debounce(() => {
            const mustAt = '/info?activeKey=otp';
            const href = window.location.href;
            if (!href.includes(mustAt)) {
                modal.warning({
                    title: t('general.tips'),
                    content: t('account.otp_required'),
                    onOk: () => {
                        window.location.href = mustAt;
                    }
                });
            }
        }, 500);

        // 密码过期提醒
        const needChangePassword = debounce(() => {
            const mustAt = '/info?activeKey=change-password';
            const href = window.location.href;
            if (!href.includes(mustAt)) {
                modal.warning({
                    title: t('general.tips'),
                    content: t('general.password_expired'),
                    onOk: () => {
                        window.location.href = mustAt;
                    }
                });
            }
        }, 500);

        // 注册事件监听
        eventEmitter.on('API:NEED_ENABLE_OPT', needEnableOTP);
        eventEmitter.on('API:NEED_CHANGE_PASSWORD', needChangePassword);

        // 清理监听
        return () => {
            eventEmitter.off('API:NEED_ENABLE_OPT', needEnableOTP);
            eventEmitter.off('API:NEED_CHANGE_PASSWORD', needChangePassword);
        };
    }, [modal, t]);

    return {contextHolder};
}
