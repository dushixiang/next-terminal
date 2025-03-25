import React from 'react';
import {Button, Result, Space} from "antd";
import {isRouteErrorResponse, Link, useNavigate, useRouteError} from "react-router-dom";
import {StyleProvider} from '@ant-design/cssinjs';


const ErrorPage = () => {

    const navigate = useNavigate();
    const error = useRouteError();

    let errorMessage: string;

    if (isRouteErrorResponse(error)) {
        // error is type `ErrorResponse`
        errorMessage = error.statusText;
    } else if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    } else {
        console.error(error);
        errorMessage = 'Unknown error';
    }

    return (
        <StyleProvider hashPriority="high">
            <div>
                <Result
                    status={'error'}
                    title={errorMessage}
                    extra={
                        <Space>
                            <Button type="primary"
                                    onClick={() => {
                                        navigate(-1);
                                    }}>Back</Button>
                            <Button type="primary"><Link to={'/'}>Home</Link></Button>
                        </Space>
                    }
                />
            </div>
        </StyleProvider>
    );
};

export default ErrorPage;