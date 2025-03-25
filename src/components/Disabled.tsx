import React, {CSSProperties, useEffect, useRef} from 'react';
import {useTranslation} from "react-i18next";

export interface Props {
    disabled?: boolean;
    children?: React.ReactNode;
    classNames?: string[]
    style?: CSSProperties | undefined;
}

const Disabled = ({disabled, children, classNames, style}: Props) => {
    let ref = useRef<HTMLDivElement>();
    let {t} = useTranslation();

    useEffect(() => {
        if (disabled && ref.current) {
            let el = ref.current;
            el.querySelectorAll('*').forEach((e) => {
                e.setAttribute('disabled', 'true');
            });
        }
    }, [ref.current]);

    return (
        <div className={'z-10 relative'}>
            {disabled &&
                <div className={'z-10 absolute flex items-center justify-center w-full h-full'}>
                    <div className={'p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md text-center'}>
                        <strong>⚠ {t('settings.license.restricted.label')}: </strong>
                        {t('settings.license.restricted.content')}
                        <a className={'text-blue-500 hover:text-blue-600'}
                           target={'_blank'}
                           href={'https://next-terminal.typesafe.cn/pricing'}>
                            {t('settings.license.restricted.pay')}
                        </a>
                    </div>
                </div>
            }
            <div className={disabled && 'blur-sm'} ref={ref}>
                {children}
            </div>
        </div>
    );
};

export default Disabled;