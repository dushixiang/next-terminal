import {useParams, useSearchParams} from "react-router-dom";
import {Tabs} from "antd";
import RoleInfo from "./RoleInfo";
import React, {useState} from "react";
import {maybe} from "../../utils/maybe";
import {useTranslation} from "react-i18next";

const RoleDetail = () => {

    let {t} = useTranslation();
    let params = useParams();
    const id = params['roleId'] as string;
    const [searchParams, setSearchParams] = useSearchParams();
    let key = maybe(searchParams.get('activeKey'), 'detail');

    let [activeKey, setActiveKey] = useState(key);

    const handleTagChange = (key: string) => {
        setActiveKey(key);
        setSearchParams({'activeKey': key});
    }

    const items = [
        {
            label: t('actions.detail'),
            key: 'detail',
            children: <RoleInfo id={id}/>
        },
    ];

    return (
        <div className={'px-4'}>
            <Tabs activeKey={activeKey} onChange={handleTagChange} items={items}>

            </Tabs>
        </div>
    );
}

export default RoleDetail;