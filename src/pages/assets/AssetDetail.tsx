import React, {useState} from 'react';
import {useParams, useSearchParams} from "react-router-dom";
import {Tabs} from "antd";
import {maybe} from "@/src/utils/maybe";
import AssetsPost from "@/src/pages/assets/AssetPost";
import AssetAuthorised from "@/src/pages/authorised/AssetAuthorised";
import {useTranslation} from "react-i18next";


const AssetDetail = () => {
    let {t} = useTranslation();

    let params = useParams();
    const id = params['assetId'] as string;
    const [searchParams, setSearchParams] = useSearchParams();
    let key = maybe(searchParams.get('activeKey'), "info");

    let [activeKey, setActiveKey] = useState(key);

    const handleTagChange = (key: string) => {
        setActiveKey(key);
        setSearchParams({'activeKey': key});
    }

    return (
        <div className={'px-4'}>
            <Tabs activeKey={activeKey} onChange={handleTagChange}
                  items={[
                      {
                          key: 'info',
                          label: t('actions.detail'),
                          children: <AssetsPost assetId={id}/>
                      },
                      {
                          key: 'bind-user',
                          label: t('assets.bind_user'),
                          children: <AssetAuthorised active={activeKey === 'bind-user'} assetId={id} view={'User'}/>
                      },
                      {
                          key: 'bind-user-group',
                          label: t('assets.bind_user_group'),
                          children: <AssetAuthorised active={activeKey === 'bind-user-group'} assetId={id}
                                                     view={'UserGroup'}/>
                      },
                  ]}
            >
            </Tabs>
        </div>
    );
};

export default AssetDetail;