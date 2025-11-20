import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {App, Button, Modal, Typography} from "antd";
import {useTranslation} from "react-i18next";
import {useMutation, useQuery} from "@tanstack/react-query";
import brandingApi from "@/api/branding-api";
import propertyApi from "@/api/property-api";
import {CustomerServiceOutlined, LoadingOutlined} from "@ant-design/icons";
import strings from "@/utils/strings";
import {useLicense} from "@/hook/use-license";
import {useMobile} from "@/hook/use-mobile";
import {cn} from "@/lib/utils";
import {MarkdownRenderer} from "@/components/MarkdownRenderer";
import {VersionInfo} from "@/components/VersionInfo";
import {ScrollArea} from '@/components/ui/scroll-area';
import {useWindowSize} from "react-use";
import wxGroup from "@/assets/images/wx.png";

const {Title} = Typography;

const About = () => {

    const {isMobile} = useMobile();
    const {t} = useTranslation();
    const contactTitle = t('settings.about.contact_us', {defaultValue: '联系我们'});

    let {modal} = App.useApp();

    let [canUpgrade, setCanUpgrade] = useState(false);
    let [contactVisible, setContactVisible] = useState(false);
    let [license] = useLicense();
    let {height} = useWindowSize();

    let brandingQuery = useQuery({
        queryKey: ['branding'],
        queryFn: brandingApi.getBranding,
    });

    let versionQuery = useQuery({
        queryKey: ['version'],
        queryFn: propertyApi.getLatestVersion,
    });

    let upgradeStatus = useQuery({
        queryKey: ['upgradeStatus'],
        queryFn: propertyApi.upgradeStatus,
        refetchInterval: 1000,
    });

    // 处理升级状态变化
    useEffect(() => {
        const status = upgradeStatus.data?.status;
        if (!status) return;

        switch (status) {
            case "failed":
                modal.error({
                    title: t('settings.about.upgrade.failed'),
                    content: upgradeStatus.data?.message,
                });
                break;
            case "success":
                modal.success({
                    title: t('settings.about.upgrade.success'),
                    content: t('settings.about.upgrade.success_content'),
                    onOk: () => {
                        window.location.reload();
                    }
                });
                break;
        }
    }, [upgradeStatus.data?.status, upgradeStatus.data?.message, modal, t]);

    let selfUpgrade = useMutation({
        mutationKey: ['upgrade'],
        mutationFn: propertyApi.upgrade,
        onSuccess: async () => {
            upgradeStatus.refetch();
        }
    });


    // 渲染更新内容
    const updateContentElement = useMemo(() => {
        if (versionQuery.isPending) {
            return <LoadingOutlined/>;
        }
        if (versionQuery.error != null) {
            return <div className={'text-red-500 mt-2'}>{t('error')}</div>
        }
        const content = versionQuery.data?.content;
        if (!strings.hasText(content)) {
            return <span></span>
        }
        return (
            <ScrollArea className={cn(
                'mt-2 p-4 border rounded-md',
            )}
                        style={{
                            height: height - 350,
                        }}
            >
                <MarkdownRenderer text={content!} isMobile={isMobile}/>
            </ScrollArea>
        );
    }, [versionQuery.isPending, versionQuery.error, versionQuery.data?.content, isMobile, t]);

    // 更新可升级状态
    useEffect(() => {
        if (versionQuery.data?.upgrade !== undefined) {
            setCanUpgrade(versionQuery.data.upgrade);
        }
    }, [versionQuery.data?.upgrade]);

    // 处理升级按钮点击
    const handleUpgrade = useCallback(() => {
        modal.confirm({
            title: t('settings.about.upgrade.title'),
            content: t('settings.about.upgrade.content'),
            onOk: () => {
                selfUpgrade.mutate();
            }
        });
    }, [modal, t, selfUpgrade]);
    return (
        <div>
            <div className={cn(
                'flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3',
                isMobile && 'items-stretch'
            )}>
                <Title level={5} style={{margin: 0}}>{t('settings.about.setting')}</Title>
                <Button
                    type="primary"
                    icon={<CustomerServiceOutlined/>}
                    onClick={() => setContactVisible(true)}
                    className={cn(isMobile && 'w-full')}
                    size={isMobile ? 'middle' : 'middle'}
                >
                    {contactTitle}
                </Button>
            </div>
            <div className={'flex flex-col gap-4'}>
                <div className={cn(
                    'space-y-4',
                    isMobile && 'w-full px-2'
                )}>
                    <div className={cn(
                        'flex flex-col gap-1',
                        isMobile ? 'text-left' : 'text-left'
                    )}>
                        <VersionInfo
                            label={t('settings.about.current_version')}
                            isPending={brandingQuery.isPending}
                            error={brandingQuery.error}
                            value={brandingQuery.data?.version}
                            errorText={t('error')}
                            isMobile={isMobile}
                        />
                        <VersionInfo
                            label={t('settings.about.latest_version')}
                            isPending={versionQuery.isPending}
                            error={versionQuery.error}
                            value={versionQuery.data?.latestVersion}
                            errorText={t('error')}
                            isMobile={isMobile}
                        />
                        <div className={cn('font-bold', isMobile && 'text-sm')}>
                            {t('settings.about.update_content')}:
                            {updateContentElement}
                        </div>
                    </div>
                    {
                        !brandingQuery.data?.hiddenUpgrade && !license.isFree() &&
                        <div className={cn(isMobile && 'text-center')}>
                            <Button type="primary"
                                    size={isMobile ? 'middle' : 'large'}
                                    loading={upgradeStatus.isPending || upgradeStatus.data?.status == "running"}
                                    disabled={!canUpgrade}
                                    onClick={handleUpgrade}>
                                {t('settings.about.upgrade.action')}
                            </Button>
                        </div>
                    }
                </div>
            </div>
            <Modal
                title={contactTitle}
                open={contactVisible}
                onCancel={() => setContactVisible(false)}
                footer={null}
                centered
                width={isMobile ? 360 : 520}
            >
                <div className={'space-y-5'}>
                    <div className={'space-y-1'}>
                        <div className={'text-xs font-semibold uppercase tracking-wide text-gray-500'}>官方网站</div>
                        <a
                            href={'https://next-terminal.typesafe.cn/'}
                            target={'_blank'}
                            rel="noreferrer"
                            className={'block text-base font-medium text-blue-500 hover:text-blue-600'}
                        >
                            https://next-terminal.typesafe.cn/
                        </a>
                    </div>
                    <div className={'space-y-1'}>
                        <div className={'text-xs font-semibold uppercase tracking-wide text-gray-500'}>授权系统</div>
                        <a
                            href={'https://license.typesafe.cn/'}
                            target={'_blank'}
                            rel="noreferrer"
                            className={'block text-base font-medium text-blue-500 hover:text-blue-600'}
                        >
                            https://license.typesafe.cn/
                        </a>
                    </div>
                    <div className={'space-y-1'}>
                        <div className={'text-xs font-semibold uppercase tracking-wide text-gray-500'}>企鹅群组</div>
                        <a
                            target="_blank"
                            rel="noreferrer"
                            href="https://qm.qq.com/cgi-bin/qm/qr?k=JP5faCYRTn0NnB3Qymiljo1zedap83Yf&jump_from=webapi&authKey=2TklvQK6HIYJ4tQGX3/RbzzwKxx8evFLy24U1Eo6BiozgaflNi3iI8BM9gMGn7ju"
                            className={'inline-flex items-center gap-2 rounded-full bg-blue-50 text-sm font-medium text-blue-600 hover:bg-blue-100'}
                        >
                            <span className={'font-semibold'}>938145268</span>
                        </a>
                    </div>
                    <div className={'space-y-3'}>
                        <div className={'text-xs font-semibold uppercase tracking-wide text-gray-500'}>微信群组</div>
                        <div className={'rounded-md border bg-gray-50 p-4 text-center'}>
                            <img src={wxGroup} alt={'扫码备注 NT'}
                                 className={'mx-auto w-64 max-w-full rounded-md shadow-sm'}/>
                            <div className={'mt-3 text-sm font-medium text-gray-600'}>扫码加微信请备注 NT</div>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default About;
