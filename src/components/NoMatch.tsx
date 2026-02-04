import React from 'react';
import {Button, Result, Space} from "antd";
import {Link, useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";

const NoMatch = () => {

    const {t} = useTranslation();
    const navigate = useNavigate();

    return (
        <div>
            <Result
                status="404"
                title="404"
                subTitle={t('general.not_found_subtitle')}
                extra={
                    <Space>
                        <Button type="primary" onClick={() => {
                            navigate(-1);
                        }}>{t('actions.back')}</Button>
                        <Button type="primary"><Link to={'/my-asset'}>{t('general.my_assets')}</Link></Button>
                        <Button type="primary"><Link to={'/'}>{t('general.home_admin')}</Link></Button>
                    </Space>
                }
            />
        </div>
    );
};

export default NoMatch;
