import React, {Suspense, useEffect, useRef, useState} from 'react';
import {
    Alert,
    App as AntdApp,
    Breadcrumb,
    Button,
    ConfigProvider,
    Dropdown,
    Layout,
    Menu,
    Modal,
    Spin,
    Switch
} from "antd";
import {BugOutlined, DownOutlined, MoonOutlined, SunOutlined} from "@ant-design/icons";
import {Link, Outlet, useLocation, useNavigate} from "react-router-dom";
import FooterComponent from "./FooterComponent";
import {getMenus} from "./menus";
import Landing from "../components/Landing";
import accountApi from "../api/account-api";
import {useTranslation} from "react-i18next";
import {StyleProvider} from '@ant-design/cssinjs';
import {useQuery} from "@tanstack/react-query";
import brandingApi from "@/src/api/branding-api";
import {hasMenu} from "@/src/utils/permission";
import clsx from "clsx";
import './ManagerLayout.css'
import {flushSync} from "react-dom";
import eventEmitter from "@/src/api/core/event-emitter";
import {debounce} from "@/src/utils/debounce";
import SimpleBar from "simplebar-react";
import {DarkTheme, DefaultTheme, useNTTheme} from "@/src/hook/use-theme";
import {translateI18nToAntdLocale, useLang} from "@/src/hook/use-lang";
import {LaptopIcon, LogOutIcon, UserIcon} from "lucide-react";
import {openOrSwitchToPage} from "@/src/utils/utils";
import licenseApi from "@/src/api/license-api";
import {useLicense} from "@/src/hook/use-license";
import Marquee from 'react-fast-marquee';
import dayjs from "dayjs";

const breadcrumbNameMap = new Map<string, string>;

const ManagerLayout = () => {

    const {t} = useTranslation();
    const [breakItems, setBreakItems] = useState<any[]>([]);

    let [ntTheme, setNTTheme] = useNTTheme();
    let [lang, setLang] = useLang();
    let [licence, setLicense] = useLicense();

    let location = useLocation();
    const navigate = useNavigate();

    let brandingQuery = useQuery({
        queryKey: ['branding'],
        queryFn: brandingApi.getBranding,
    });
    let infoQuery = useQuery({
        queryKey: ['infoQuery'],
        queryFn: accountApi.getUserInfo,
    })
    let licenseQuery = useQuery({
        queryKey: ['simpleLicense'],
        queryFn: licenseApi.getSimpleLicense,
    })

    useEffect(() => {
        if (licenseQuery.data) {
            setLicense(licenseQuery.data);
        }
    }, [licenseQuery.data]);

    const [modal, contextHolder] = Modal.useModal();

    useEffect(() => {
        eventEmitter.on("NETWORK:UN_CONNECT", () => {

        })

        eventEmitter.on("UI:LOADING", (loading: string) => {

        })

        eventEmitter.on("API:CHANGE_LANG", (lang: string) => {
            setLang({
                i18n: lang,
                antdLocale: translateI18nToAntdLocale(lang)
            })
        })

        let needEnableOPT = debounce(() => {
            let mustAt = '/info?activeKey=otp';
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
            let mustAt = '/info?activeKey=change-password';
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

    const [isDarkMode, setIsDarkMode] = useState(ntTheme.isDark);
    const ref = useRef(null);

    const toggleDarkMode = async (isDarkMode: boolean) => {
        /**
         * Return early if View Transition API is not supported
         * or user prefers reduced motion
         */
        if (
            !ref.current ||
            !document.startViewTransition ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            setIsDarkMode(isDarkMode);
            return;
        }

        await document.startViewTransition(() => {
            flushSync(() => {
                setIsDarkMode(isDarkMode);
            });
        }).ready;

        const {top, left, width, height} = ref.current.getBoundingClientRect();
        const x = left + width / 2;
        const y = top + height / 2;
        const right = window.innerWidth - left;
        const bottom = window.innerHeight - top;
        const maxRadius = Math.hypot(
            Math.max(left, right),
            Math.max(top, bottom),
        );

        document.documentElement.animate(
            {
                clipPath: [
                    `circle(0px at ${x}px ${y}px)`,
                    `circle(${maxRadius}px at ${x}px ${y}px)`,
                ],
            },
            {
                duration: 500,
                easing: 'ease-in-out',
                pseudoElement: '::view-transition-new(root)',
            }
        );
    };

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        if (isDarkMode) {
            setNTTheme(DarkTheme)
        } else {
            setNTTheme(DefaultTheme)
        }
    }, [isDarkMode]);

    let menus = getMenus(t);
    menus.forEach(r => {
        if (r.children) {
            r.children.forEach(c => {
                breadcrumbNameMap.set('/' + c.key, c.label)
            })
        } else {
            breadcrumbNameMap.set('/' + r.key, r.label)
        }
    });

    let filteredMenus = menus
        .filter(lv1 => {
            return hasMenu(lv1.key);
        })
        .map(lv1 => {
            lv1.children = lv1.children?.filter(lv2 => {
                return hasMenu(lv2.key);
            });
            return lv1;
        });

    let [collapsed, setCollapsed] = useState(false);

    let _current = location.pathname.split('/')[1];

    let [current, setCurrent] = useState(_current);
    const [stateOpenKeys, setStateOpenKeys] = useState(JSON.parse(sessionStorage.getItem('openKeys') as string));

    useEffect(() => {
        setCurrent(_current);
        // setTitle(breadcrumbNameMap.get('/' + _current));
    }, [_current]);

    useEffect(() => {
        const pathSnippets = location.pathname.split('/').filter(i => i);
        const extraBreadcrumbItems = pathSnippets.map((_, index) => {
            const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
            let label = breadcrumbNameMap.get(url);
            if (!label) {
                label = '';
            }
            return {
                title: <Link to={url}>{label}</Link>
            }
        });

        const breadcrumbItems = [{title: <Link to={'/'}>{t('general.home')}</Link>}].concat(extraBreadcrumbItems);
        setBreakItems(breadcrumbItems);
    }, [location.pathname]);

    const subMenuChange = (openKeys: string[]) => {
        setStateOpenKeys(openKeys);
        sessionStorage.setItem('openKeys', JSON.stringify(openKeys));
    }

    const dropMenus = () => {
        let menus = [
            {
                key: 'my-asset',
                icon: <LaptopIcon className={'h-4 w-4'}/>,
                label: <Link to={'/x-asset'} target="_blank">{t('account.my_asset')}</Link>
            },
            {
                key: 'info',
                icon: <UserIcon className={'h-4 w-4'}/>,
                label: <Link to={'/info'}>{t("account.profile")}</Link>
            },
            {
                key: 'logout',
                icon: <LogOutIcon className={'h-4 w-4'}/>,
                danger: true,
                label: <div onClick={async () => {
                    await accountApi.logout();
                    window.location.href = '/login';
                }}>
                    {t('account.logout')}
                </div>
            },
        ];

        if (brandingQuery.data?.dev) {
            menus.push({
                key: 'debug',
                icon: <BugOutlined/>,
                label: <a target='_blank'
                          href={`/debug/pprof/`}>{t('menus.dev')}</a>
            });
        }

        return menus;
    }

    const renderBanner = () => {
        if (!licence) {
            return undefined;
        }
        if (licence.isExpired()) {
            return (
                <Alert
                    type={'error'}
                    banner
                    message={
                        <Marquee pauseOnHover gradient={false}>
                            {t('errors.20002')}
                        </Marquee>
                    }
                />
            )
        }
        if (licence.isTest()) {
            return (
                <Alert
                    banner
                    message={
                        <Marquee pauseOnHover gradient={false}>
                            {t('settings.license.test_warning')}: &nbsp; {dayjs(licence.expired).format('YYYY-MM-DD HH:mm:ss')}
                        </Marquee>
                    }
                />
            )
        }
        return undefined;
    }

    return (
        <StyleProvider hashPriority="high">
            <ConfigProvider
                theme={{
                    algorithm: ntTheme.algorithm,
                    components: {}
                }}
                locale={lang.antdLocale}
            >
                <AntdApp>
                    {renderBanner()}
                    <Layout
                        hasSider={true}
                        style={{
                            backgroundColor: ntTheme.backgroundColor,
                        }}
                    >
                        <Layout.Sider collapsible
                                      collapsed={collapsed}
                                      onCollapse={(value) => setCollapsed(value)}
                                      className={'h-screen x-side z-10'}
                                      theme={isDarkMode ? 'dark' : 'light'}
                                      style={{
                                          height: '100vh',
                                          backgroundColor: ntTheme.backgroundColor,
                                          position: 'fixed',
                                      }}
                        >
                            <div className={'flex flex-col '}>
                                <div className={'flex-none'}>
                                    <Spin spinning={brandingQuery.isLoading}>
                                        <div
                                            className={clsx(
                                                "flex items-center gap-2 justify-center h-[60px]",
                                            )}>
                                            {
                                                brandingQuery.data ?
                                                    <img src={brandingApi.getLogo()} alt='logo'
                                                         className={'h-8 w-8 rounded'}/> :
                                                    undefined
                                            }
                                            {
                                                !collapsed ?
                                                    <div
                                                        className={clsx('font-bold text-lg transition duration-100 ease-in-out', {
                                                            // 'text-white': themeKey === 'dark'
                                                        })}>
                                                        {brandingQuery.data?.name}
                                                    </div> :
                                                    undefined
                                            }
                                        </div>
                                    </Spin>
                                </div>

                                <div className={''}>
                                    <SimpleBar className=""
                                               style={{
                                                   height: window.innerHeight - 72 - 48,
                                               }}
                                    >
                                        <Menu
                                            onClick={(e) => {
                                                navigate(e.key);
                                                setCurrent(e.key);
                                                infoQuery.refetch();
                                            }}
                                            selectedKeys={[current]}
                                            onOpenChange={subMenuChange}
                                            defaultOpenKeys={stateOpenKeys}
                                            openKeys={stateOpenKeys}
                                            mode="inline"
                                            defaultSelectedKeys={['']}
                                            items={filteredMenus}
                                            // style={{paddingBottom: 48}}
                                            style={{
                                                backgroundColor: ntTheme.backgroundColor,
                                            }}
                                        >
                                        </Menu>
                                    </SimpleBar>
                                </div>

                            </div>
                        </Layout.Sider>

                        <div className={'flex-grow flex flex-col min-h-screen'}
                             style={{
                                 marginLeft: collapsed ? 80 : 200,
                             }}
                        >
                            <div className={'flex items-center h-[60px] px-8 justify-between'}>
                                <Breadcrumb items={breakItems}/>
                                <div className={'flex items-center gap-4'}>

                                    <div className={'cursor-pointer'}
                                         onClick={() => {
                                             const url = `/access`;
                                             openOrSwitchToPage(url, 'NT_Access');
                                         }}
                                    >
                                        <LaptopIcon className={'w-5 h-5'}/>
                                    </div>

                                    <Switch
                                        ref={ref}
                                        checkedChildren={<MoonOutlined/>}
                                        unCheckedChildren={<SunOutlined/>}
                                        checked={isDarkMode}
                                        onChange={toggleDarkMode}
                                    />

                                    <Dropdown
                                        menu={{
                                            items: dropMenus()
                                        }}
                                    >
                                        <Button type="text" icon={<DownOutlined/>}>
                                            {infoQuery.data?.nickname}
                                        </Button>
                                    </Dropdown>
                                </div>
                            </div>

                            <Suspense fallback={<Landing/>}>
                                <div className={'flex-grow m-4'}>
                                    <Outlet/>
                                </div>
                            </Suspense>

                            <FooterComponent/>
                        </div>
                        {contextHolder}
                    </Layout>
                </AntdApp>
            </ConfigProvider>
        </StyleProvider>
    );
}

export default ManagerLayout;