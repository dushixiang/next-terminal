import React, {useEffect, useState} from 'react';
import {useTranslation} from "react-i18next";
import {useQuery} from "@tanstack/react-query";
import userApi from "@/src/api/user-api";
import {TransferDirection} from "antd/es/transfer";
import {Transfer} from "antd";
import authorisedWebsiteApi from "@/src/api/authorised-website-api";
import userGroupApi from "@/src/api/user-group-api";

interface WebsiteAuthorisedProp {
    active: boolean
    websiteId: string
    view: "User" | "UserGroup"
}

interface Item {
    key: string
    title: string
}

const WebsiteAuthorised = ({active, websiteId, view}: WebsiteAuthorisedProp) => {
    let {t} = useTranslation();
    const [targetKeys, setTargetKeys] = useState<string[]>([]);

    let usersQuery = useQuery({
        queryKey: ['user'],
        enabled: active,
        queryFn: async () => {
            switch (view) {
                case "User":
                    let users = await userApi.getAll();
                    return users.map(item => {
                        return {
                            key: item.id,
                            title: item.nickname,
                        }
                    });
                case "UserGroup":
                    let items = await userGroupApi.getAll();
                    return items.map(item => {
                        return {
                            key: item.id,
                            title: item.name,
                        }
                    });
            }
        },
    });

    let selectedKeysQuery = useQuery({
        queryKey: ['user-id'],
        enabled: active,
        queryFn: () => {
            switch (view) {
                case "User":
                    return authorisedWebsiteApi.boundUser(websiteId);
                case "UserGroup":
                    return authorisedWebsiteApi.boundUserGroup(websiteId);
            }
        }
    });

    useEffect(() => {
        if (selectedKeysQuery.data) {
            setTargetKeys(selectedKeysQuery.data)
        }
    }, [selectedKeysQuery.data]);

    if (usersQuery.isLoading) {
        return <div>Loading...</div>
    }

    let items = usersQuery.data;

    const onChange = async (nextTargetKeys: string[], direction: TransferDirection, moveKeys: string[]) => {
        switch (direction) {
            case 'left':
                switch (view) {
                    case "User":
                        await authorisedWebsiteApi.unboundUser(websiteId, moveKeys);
                        break;
                    case "UserGroup":
                        await authorisedWebsiteApi.unboundUserGroup(websiteId, moveKeys);
                }
                break;
            case 'right':
                switch (view) {
                    case "User":
                        await authorisedWebsiteApi.bindingUser(websiteId, moveKeys);
                        break
                    case "UserGroup":
                        await authorisedWebsiteApi.bindingUserGroup(websiteId, moveKeys);
                }
                break;
        }
        setTargetKeys(nextTargetKeys);
    };

    return (
        <Transfer
            dataSource={items}
            titles={[t('general.unbound'), t('general.bound')]}
            operations={[t('actions.binding'), t('actions.unbind')]}
            showSearch
            listStyle={{
                width: 250,
                height: 400,
            }}
            targetKeys={targetKeys}
            onChange={onChange}
            render={(item) => item.title}
        />
    );
};

export default WebsiteAuthorised;