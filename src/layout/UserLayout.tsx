import React, {Suspense, useEffect} from 'react';
import {Outlet} from "react-router-dom";
import {App as AntdApp, ConfigProvider, Modal} from "antd";
import Landing from "../components/Landing";
import {StyleProvider} from '@ant-design/cssinjs';
import FooterComponent from "@/layout/FooterComponent";
import UserHeader from "@/layout/UserHeader";
import eventEmitter from "@/api/core/event-emitter";
import {debounce} from "@/utils/debounce";
import {translateI18nToAntdLocale} from "@/helper/lang";
import {useTranslation} from "react-i18next";
import i18n from "i18next";
import {useNTTheme} from "@/hook/use-theme";

const UserLayout = () => {

    let {t} = useTranslation();
    const [ntTheme] = useNTTheme();

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
                    algorithm: ntTheme.algorithm,
                    components: {
                        Layout: {
                            triggerBg: '#131313',
                        }
                    }
                }}
                locale={translateI18nToAntdLocale(i18n.language)}
            >
                <AntdApp>
                    <div
                        className={'flex flex-col min-h-screen transition-colors max-md:[&_.ant-table-wrapper]:overflow-x-auto max-md:[&_.ant-table-thead>tr>th]:px-2 max-md:[&_.ant-table-thead>tr>th]:py-2 max-md:[&_.ant-table-thead>tr>th]:text-xs max-md:[&_.ant-table-thead>tr>th]:whitespace-nowrap max-md:[&_.ant-table-tbody>tr>td]:px-2 max-md:[&_.ant-table-tbody>tr>td]:py-2 max-md:[&_.ant-table-tbody>tr>td]:text-xs max-md:[&_.ant-table-tbody>tr>td]:break-words max-md:[&_.ant-btn-group]:flex-wrap max-md:[&_.ant-btn-group]:gap-1 max-md:[&_.ant-form-item]:mb-3 max-md:[&_.ant-form-item-label]:pb-1 max-md:[&_.ant-pro-table-search]:p-3 max-md:[&_.ant-pro-card-body]:p-3'}
                        style={{backgroundColor: ntTheme.backgroundColor}}
                    >
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
