import {externalLinks} from "@/config/external-links";
import {App, Button, Spin, Tag, Tooltip, Typography} from "antd";
import {CheckCircleOutlined, CopyOutlined, ExportOutlined, InfoCircleOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {useQuery} from "@tanstack/react-query";
import copy from "copy-to-clipboard";
import propertyApi from "@/api/property-api";
import {cn} from "@/lib/utils";
import {VersionInfo} from "@/components/VersionInfo";

const UPGRADE_COMMAND = 'docker compose pull && docker compose up -d';

interface AboutProps {
    compact?: boolean;
}

const About = ({compact = false}: AboutProps) => {
    const {t} = useTranslation();
    const {message} = App.useApp();

    const versionQuery = useQuery({
        queryKey: ['version'],
        queryFn: propertyApi.getLatestVersion,
        staleTime: 30 * 60 * 1000,
    });

    const handleCopyUpgradeCommand = () => {
        if (copy(UPGRADE_COMMAND)) {
            message.success(t('settings.about.upgrade_command_copied'));
            return;
        }
        message.error(t('settings.about.upgrade_command_copy_failed'));
    };

    const version = versionQuery.data;

    return (
        <Spin spinning={versionQuery.isPending}>
            <div className={cn(
                'space-y-5',
                compact
                    ? 'max-h-[calc(100vh-48px)] w-[min(360px,calc(100vw-48px))] overflow-y-auto pr-1'
                    : 'max-w-3xl'
            )}>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <Typography.Title level={5} className="!mb-1">
                            {t('settings.about.version_update')}
                        </Typography.Title>
                        <Typography.Text type="secondary">
                            {versionQuery.isError
                                ? t('settings.about.version_check_failed')
                                : version?.upgrade
                                    ? t('settings.about.update_available', {version: version.latestVersion})
                                    : t('settings.about.up_to_date')}
                        </Typography.Text>
                    </div>
                    {version && (
                        <Tag
                            color={version.upgrade ? 'blue' : 'success'}
                            icon={version.upgrade ? <InfoCircleOutlined/> : <CheckCircleOutlined/>}
                        >
                            {version.upgrade
                                ? t('settings.about.new_version')
                                : t('settings.about.latest_status')}
                        </Tag>
                    )}
                </div>

                <div className="flex flex-col gap-1">
                    <VersionInfo
                        label={t('settings.about.current_version')}
                        isPending={versionQuery.isPending}
                        error={versionQuery.error}
                        value={version?.currentVersion}
                        errorText={t('general.error')}
                        isMobile={compact}
                    />
                    <VersionInfo
                        label={t('settings.about.latest_version')}
                        isPending={versionQuery.isPending}
                        error={versionQuery.error}
                        value={version?.latestVersion}
                        errorText={t('general.error')}
                        isMobile={compact}
                    />
                </div>

                {externalLinks.changelog && <Typography.Link
                    href={externalLinks.changelog}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1"
                >
                    {t('settings.about.view_changelog')}
                    <ExportOutlined/>
                </Typography.Link>}

                <section>
                    <Typography.Text strong>{t('settings.about.upgrade_method')}</Typography.Text>
                    <Typography.Paragraph type="secondary" className="!mb-2 !mt-1">
                        {t('settings.about.upgrade_instruction')}
                    </Typography.Paragraph>
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-xs text-gray-700 dark:text-gray-200">
                            {UPGRADE_COMMAND}
                        </code>
                        <Tooltip title={t('settings.about.copy_upgrade_command')}>
                            <Button
                                type="text"
                                size="small"
                                icon={<CopyOutlined/>}
                                onClick={handleCopyUpgradeCommand}
                                aria-label={t('settings.about.copy_upgrade_command')}
                                className="shrink-0"
                            />
                        </Tooltip>
                    </div>
                </section>
            </div>
        </Spin>
    );
};

export default About;
