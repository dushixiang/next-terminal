import React, {CSSProperties} from 'react';
import {Button} from "antd";

export interface NButtonProps {
    href?: string;
    target?: string;
    key?: string
    danger?: boolean;
    disabled?: boolean;
    children?: React.ReactNode;
    onClick?: () => void
    classNames?: string[]
    style?: CSSProperties | undefined;
    loading?: boolean
}

const NButton = ({classNames, href, target, danger, disabled, children, onClick, style, loading}: NButtonProps) => {
    // if (href) {
    //     classNames?.push('underline');
    // }

    if(!style){
        style = {padding: 0}
    }
    return (
        <Button
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
};

export default NButton;