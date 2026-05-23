import React, {CSSProperties, forwardRef} from 'react';
import {Button} from "antd";

export interface NButtonProps {
    href?: string;
    target?: string;
    danger?: boolean;
    disabled?: boolean;
    children?: React.ReactNode;
    onClick?: () => void
    classNames?: string[]
    style?: CSSProperties | undefined;
    loading?: boolean
}

const NButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, NButtonProps>(({
    classNames,
    href,
    target,
    danger,
    disabled,
    children,
    onClick,
    style,
    loading,
}, ref) => {
    // if (href) {
    //     classNames?.push('underline');
    // }

    if (!style) {
        style = {padding: 0}
    }
    return (
        <Button
            ref={ref}
            className={classNames?.join(' ')}
            type={'link'}
            size={'small'}
            href={href}
            danger={danger}
            disabled={disabled}
            onClick={onClick}
            style={style}
            target={target}
            loading={loading}
        >
            {children}
        </Button>
    );
});

NButton.displayName = 'NButton';

export default NButton;
