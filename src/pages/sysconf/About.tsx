import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {App, Button, Typography} from "antd";
import {useTranslation} from "react-i18next";
import {useMutation, useQuery} from "@tanstack/react-query";
import brandingApi from "@/src/api/branding-api";
import propertyApi from "@/src/api/property-api";
import {LoadingOutlined} from "@ant-design/icons";
import strings from "@/src/utils/strings";
import {useLicense} from "@/src/hook/use-license";
import {useMobile} from "@/src/hook/use-mobile";
import {cn} from "@/lib/utils";
import {MarkdownRenderer} from "@/src/components/MarkdownRenderer";
import {VersionInfo} from "@/src/components/VersionInfo";
import {ScrollArea} from '@/components/ui/scroll-area';
import {useWindowSize} from "react-use";
import wxGroup from "@/src/assets/images/wx.png";

const {Title} = Typography;

const About = () => {

    const {isMobile} = useMobile();
    const {t} = useTranslation();

    let {modal} = App.useApp();

    let [canUpgrade, setCanUpgrade] = useState(false);
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
            <Title level={5} style={{marginTop: 0}}>{t('settings.about.setting')}</Title>
            <div className={'grid md:grid-cols-2 gap-4'}>
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

                <div className={'border p-4 rounded-md'}>
                    <div className={'font-bold mb-2'}>联系我们</div>
                    <div className={'h-1 border-b mb-2'}></div>

                    <VersionInfo
                        label={'官网网站'}
                        isPending={false}
                        error={null}
                        value={<a href={'https://next-terminal.typesafe.cn/'}
                                  target={'_blank'}>https://next-terminal.typesafe.cn/</a>}
                        errorText={''}
                        isMobile={isMobile}
                    />

                    <VersionInfo
                        label={'授权系统'}
                        isPending={false}
                        error={null}
                        value={<a href={'https://license.typesafe.cn/'}
                                  target={'_blank'}>https://license.typesafe.cn/</a>}
                        errorText={''}
                        isMobile={isMobile}
                    />

                    <VersionInfo
                        label={'企鹅群组'}
                        isPending={false}
                        error={null}
                        value={<a target="_blank"
                                  href="https://qm.qq.com/cgi-bin/qm/qr?k=JP5faCYRTn0NnB3Qymiljo1zedap83Yf&jump_from=webapi&authKey=2TklvQK6HIYJ4tQGX3/RbzzwKxx8evFLy24U1Eo6BiozgaflNi3iI8BM9gMGn7ju">
                            <div className={'flex items-center gap-1'}>
                                <span>938145268</span>
                            </div>
                        </a>}
                        errorText={''}
                        isMobile={isMobile}
                    />

                    <VersionInfo
                        label={'微信群组'}
                        isPending={false}
                        error={null}
                        value={<div>
                            <img src={wxGroup} alt={'扫码备注 nt'} className={'w-80'}/>
                            <div className={'text-red-500 font-medium text-center'}>扫码加微信请备注 NT</div>
                        </div>}
                        errorText={''}
                        isMobile={isMobile}
                    />
                </div>
            </div>
        </div>
    );
};

export default About;