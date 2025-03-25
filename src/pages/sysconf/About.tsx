import React, {useEffect, useState} from 'react';
import {App, Button, Typography} from "antd";
import {useTranslation} from "react-i18next";
import {useMutation, useQuery} from "@tanstack/react-query";
import brandingApi from "@/src/api/branding-api";
import propertyApi from "@/src/api/property-api";
import {LoadingOutlined} from "@ant-design/icons";
import strings from "@/src/utils/strings";
import SimpleBar from "simplebar-react";
import {useLicense} from "@/src/hook/use-license";

const {Title} = Typography;

const About = () => {

    const {t} = useTranslation();

    let {modal} = App.useApp();

    let [canUpgrade, setCanUpgrade] = useState(false);
    let [license] = useLicense();

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

    useEffect(() => {
        switch (upgradeStatus.data?.status) {
            case "idle":
                break;
            case "running":
                break;
            case "failed":
                modal.error({
                    title: t('settings.about.upgrade.failed'),
                    content: upgradeStatus.data?.message,
                })
                break;
            case "success":
                modal.success({
                    title: t('settings.about.upgrade.success'),
                    content: t('settings.about.upgrade.success_content'),
                    onOk: () => {
                        window.location.reload();
                    }
                })
                break;
        }
    }, [upgradeStatus.data]);

    let selfUpgrade = useMutation({
        mutationKey: ['upgrade'],
        mutationFn: propertyApi.upgrade,
        onSuccess: async () => {
            upgradeStatus.refetch();
        }
    });

    const renderLatestVersion = () => {
        if (versionQuery.isPending) {
            return <LoadingOutlined/>;
        }
        if (versionQuery.error != null) {
            return <span style={{color: 'red'}}>{t('error')}</span>
        }
        return <span className={'font-normal'}>{versionQuery.data?.latestVersion}</span>;
    }

    const renderUpdateContent = () => {
        if (versionQuery.isPending) {
            return <LoadingOutlined/>;
        }
        if (versionQuery.error != null) {
            return <span style={{color: 'red'}}>{t('error')}</span>
        }
        let content = versionQuery.data?.content;
        if (!strings.hasText(content)) {
            return <span></span>
        }
        return <SimpleBar
            className={'mt-2 p-4 border rounded-md text-sm font-normal h-[400px] w-[800px]'}>
            <pre>{content}</pre>
        </SimpleBar>;
    }

    useEffect(() => {
        if (versionQuery.data) {
            setCanUpgrade(versionQuery.data?.upgrade);
        }
    }, [versionQuery.data]);

    const handleUpgrade = () => {
        modal.confirm({
            title: t('settings.about.upgrade.title'),
            content: t('settings.about.upgrade.content'),
            onOk: () => {
                selfUpgrade.mutate()
            }
        })
    }
    return (
        <div>
            <Title level={5} style={{marginTop: 0}}>{t('settings.about.setting')}</Title>
            <div className={'flex items-center justify-center'}>
                <div className={'space-y-4'}>
                    <Title level={5} style={{marginTop: 0}}>{brandingQuery.data?.name}</Title>
                    <div className={'flex flex-col gap-1 text-left'}>
                        <div className={'font-bold'}>{t('settings.about.current_version')}: <span
                            className={'font-normal'}>{brandingQuery.data?.version}</span></div>
                        <div className={'font-bold'}>{t('settings.about.latest_version')}: {renderLatestVersion()}</div>
                        {
                            !brandingQuery.data?.hiddenUpgrade &&
                            <div className={'font-bold'}>{t('settings.about.update_content')}:
                                {renderUpdateContent()}
                            </div>
                        }
                    </div>
                    {
                        !brandingQuery.data?.hiddenUpgrade && !license.isFree() &&
                        <Button type="primary"
                                loading={upgradeStatus.isPending || upgradeStatus.data?.status == "running"}
                                disabled={!canUpgrade}
                                onClick={handleUpgrade}>
                            {t('settings.about.upgrade.action')}
                        </Button>
                    }
                </div>
            </div>
        </div>
    );
};

export default About;