import React from 'react';
import {Link} from "react-router-dom";

interface Props {
    to: string;
    children?: React.ReactNode;
}

const NLink = ({to, children}: Props) => {
    return (
        <Link to={to} className={'text-blue-500 hover:underline'}>
            {children}
        </Link>
    );
};

export default NLink;