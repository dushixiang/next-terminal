import React from 'react';
import {Spin} from "antd";
import {useTranslation} from "react-i18next";

const Landing = () => {
    const {t} = useTranslation();
    return (
        <div className={'flex justify-center items-center h-screen'}>
            <Spin tip={t('general.loading_detail')}>
                <div style={{width: 800}}></div>
            </Spin>
        </div>
    )
};

export default Landing;
