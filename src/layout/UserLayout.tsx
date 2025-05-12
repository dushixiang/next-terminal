import React, {Suspense, useEffect} from 'react';
import {Outlet} from "react-router-dom";
import {App as AntdApp, ConfigProvider, Modal} from "antd";
import Landing from "../components/Landing";
import {StyleProvider} from '@ant-design/cssinjs';
import './UserLayout.css';
import FooterComponent from "@/src/layout/FooterComponent";
import UserHeader from "@/src/layout/UserHeader";
import eventEmitter from "@/src/api/core/event-emitter";
import {debounce} from "@/src/utils/debounce";
import {translateI18nToAntdLocale, useLang} from "@/src/hook/use-lang";
import {useTranslation} from "react-i18next";

const UserLayout = () => {

    let [lang] = useLang();
    let {t} = useTranslation();

    let [modal, contextHolder] = Modal.useModal();

    useEffect(() => {
        let needEnableOPT = debounce(() => {
            let mustAt = '/x-info?activeKey=otp';
            let href = window.location.href;
            if (!href.includes(mustAt)) {
                modal.warning({
                    title: t('general.tips'),
                    content: t('account.otp_required'),
                    onOk: () => {
                        window.location.href = mustAt;
                    }
                })
            }
        }, 500);

        eventEmitter.on("API:NEED_ENABLE_OPT", () => {
            needEnableOPT()
        })

        let needChangePassword = debounce(() => {
            let mustAt = '/x-info?activeKey=change-password';
            let href = window.location.href;
            if (!href.includes(mustAt)) {
                modal.warning({
                    title: t('general.tips'),
                    content: t('general.password_expired'),
                    onOk: () => {
                        window.location.href = mustAt;
                    }
                })
            }
        }, 500);

        eventEmitter.on("API:NEED_CHANGE_PASSWORD", () => {
            needChangePassword();
        })
    }, []);

    return (
        <StyleProvider hashPriority="high">
            <ConfigProvider
                theme={{
                    // algorithm: getAlgorithmKey(themeKey),
                }}
                locale={translateI18nToAntdLocale(lang)}
            >
                <AntdApp>
                    <div className={'flex flex-col min-h-screen bg-[#F0F4F8]'}>
                        <UserHeader/>
                        <div className={'flex-grow'}>
                            <Suspense fallback={<Landing/>}>
                                <Outlet/>
                            </Suspense>
                        </div>

                        <FooterComponent/>
                    </div>

                    {contextHolder}
                </AntdApp>
            </ConfigProvider>
        </StyleProvider>
    );
}

export default UserLayout;