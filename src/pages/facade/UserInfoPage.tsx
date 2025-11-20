import React from 'react';
import InfoPage from "@/pages/account/InfoPage";
import {useTranslation} from "react-i18next";

const UserInfoPage = () => {
    let {t} = useTranslation();
    return (
        <div className={'md:px-20 px-4'}>
            <div className={'py-6 flex '}>
                <div className={'flex-grow text-xl font-bold'}>
                    {t('account.profile')}
                </div>
            </div>
            <div className={'rounded p-4 pl-0 bg-white'}>
                <InfoPage/>
            </div>
        </div>
    );
};

export default UserInfoPage;