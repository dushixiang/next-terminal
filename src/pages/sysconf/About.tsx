import React, {useEffect, useState} from 'react';
import {App, Button, Typography} from "antd";
import {useTranslation} from "react-i18next";
import {useMutation, useQuery} from "@tanstack/react-query";
import brandingApi from "@/api/branding-api";
import propertyApi from "@/api/property-api";
import {useLicense} from "@/hook/LicenseContext";
import {useMobile} from "@/hook/use-mobile";
import {cn} from "@/lib/utils";
import {VersionInfo} from "@/components/VersionInfo";

const {Title} = Typography;
const CHANGELOG_URL = 'https://license.typesafe.cn/changelog';

const About = () => {

    const {isMobile} = useMobile();
    const {t} = useTranslation();

    let {modal} = App.useApp();

    let [canUpgrade, setCanUpgrade] = useState(false);
    let { license } = useLicense();
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


    // 更新可升级状态
    useEffect(() => {
        if (versionQuery.data?.upgrade !== undefined) {
            setCanUpgrade(versionQuery.data.upgrade);
        }
    }, [versionQuery.data?.upgrade]);

    // 处理升级按钮点击
    const handleUpgrade = () => {
        modal.confirm({
            title: t('settings.about.upgrade.title'),
            content: t('settings.about.upgrade.content'),
            onOk: () => {
                selfUpgrade.mutate();
            }
        });
    };
    return (
        <div>
            <div className={cn(
                'flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3',
                isMobile && 'items-stretch'
            )}>
                <Title level={5} style={{margin: 0}}>{t('settings.about.setting')}</Title>
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
                            <a
                                href={CHANGELOG_URL}
                                target="_blank"
                                rel="noreferrer"
                                className={'mt-2 block text-base font-medium text-blue-500 hover:text-blue-600'}
                            >
                                {CHANGELOG_URL}
                            </a>
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
        </div>
    );
};

export default About;
