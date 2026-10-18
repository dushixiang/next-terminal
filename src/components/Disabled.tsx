import {externalLinks} from "@/config/external-links";
import {type CSSProperties, type ReactNode, useId} from 'react';
import {Button, theme} from 'antd';
import {ArrowUpRight, CheckCircle2, Sparkles} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {cn} from '@/lib/utils';
import type {DisabledFeature} from './disabled-features';

interface Props {
    disabled?: boolean;
    feature: DisabledFeature;
    compact?: boolean;
    children?: ReactNode;
    className?: string;
    style?: CSSProperties;
}

const Disabled = ({disabled, feature, compact = false, children, className, style}: Props) => {
    const {t} = useTranslation();
    const {token} = theme.useToken();
    const titleId = useId();

    if (!disabled) {
        return <div className={className} style={style}>{children}</div>;
    }

    const prefix = `restricted_features.${feature}`;
    return (
        <section
            aria-labelledby={titleId}
            className={cn('@container overflow-hidden rounded-xl border mb-4', className)}
            style={{background: token.colorBgContainer, borderColor: token.colorBorderSecondary, ...style}}
        >
            <div className={cn('mx-auto w-full max-w-5xl', compact ? 'p-5' : 'px-6 py-8 sm:px-10 sm:py-12')}>
                <div className="mb-5 flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                          style={{background: token.colorPrimaryBg, color: token.colorPrimary}}>
                        <Sparkles size={21} aria-hidden="true"/>
                    </span>
                    <span className="text-xs font-medium tracking-wide" style={{color: token.colorTextSecondary}}>
                        {t('restricted_features.label')}
                    </span>
                </div>
                <h2 id={titleId} className={cn('m-0 font-semibold tracking-tight', compact ? 'text-lg' : 'text-2xl')}
                    style={{color: token.colorText}}>
                    {t(`${prefix}.title`)}
                </h2>
                <p className="mb-0 mt-3 max-w-3xl text-sm leading-7" style={{color: token.colorTextSecondary}}>
                    {t(`${prefix}.description`)}
                </p>
                <ul className={cn('m-0 mt-6 grid list-none gap-3 p-0', !compact && '@2xl:grid-cols-3')}>
                    {(['benefit_1', 'benefit_2', 'benefit_3'] as const).map(key => (
                        <li key={key} className="flex items-start gap-3 rounded-lg p-4"
                            style={{background: token.colorFillAlter, color: token.colorText}}>
                            <CheckCircle2 size={17} className="mt-0.5 shrink-0" style={{color: token.colorPrimary}} aria-hidden="true"/>
                            <span className="text-sm leading-6">{t(`${prefix}.${key}`)}</span>
                        </li>
                    ))}
                </ul>
                <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t pt-5"
                     style={{borderColor: token.colorBorderSecondary}}>
                    <p className="m-0 text-xs leading-5" style={{color: token.colorTextSecondary}}>
                        {t('restricted_features.license_note')}
                    </p>
                    {externalLinks.pricing && <Button type="primary" href={externalLinks.pricing} target="_blank" rel="noopener noreferrer">
                        {t('restricted_features.learn_more')}
                        <ArrowUpRight size={15} aria-hidden="true"/>
                    </Button>}
                </div>
            </div>
        </section>
    );
};

export default Disabled;
