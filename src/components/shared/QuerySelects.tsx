import React, {useState, useEffect} from 'react';
import {useTranslation} from "react-i18next";
import {Select} from "antd";
import userApi, {User} from "@/api/user-api";
import departmentApi, {Department} from "@/api/department-api";
import assetApi, {Asset} from "@/api/asset-api";
import websiteApi, {Website} from "@/api/website-api";
import databaseAssetApi, {DatabaseAsset} from "@/api/database-asset-api";

interface SelectProps {
    value?: string;
    onChange?: (value: string) => void;
}

// 用户查询组件
export const UserSelect = ({value, onChange}: SelectProps) => {
    const {t} = useTranslation();
    const [options, setOptions] = useState<{label: string, value: string}[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const result = await userApi.getAll();
                const userOptions = result.map((user: User) => ({
                    label: user.nickname || user.username,
                    value: user.id,
                }));
                setOptions(userOptions);
            } catch (error) {
                console.error('Failed to fetch users:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    return (
        <Select
            value={value}
            onChange={onChange}
            placeholder={t('menus.identity.submenus.user')}
            allowClear
            showSearch
            loading={loading}
            options={options}
            filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
            }
        />
    );
};

// 部门查询组件
export const DepartmentSelect = ({value, onChange}: SelectProps) => {
    const {t} = useTranslation();
    const [options, setOptions] = useState<{label: string, value: string}[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchDepartments = async () => {
            setLoading(true);
            try {
                const result = await departmentApi.getAll();
                const deptOptions = result.map((dept: Department) => ({
                    label: dept.name,
                    value: dept.id,
                }));
                setOptions(deptOptions);
            } catch (error) {
                console.error('Failed to fetch departments:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDepartments();
    }, []);

    return (
        <Select
            value={value}
            onChange={onChange}
            placeholder={t('menus.identity.submenus.department')}
            allowClear
            showSearch
            loading={loading}
            options={options}
            filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
            }
        />
    );
};

// 资产组查询组件
export const AssetGroupSelect = ({value, onChange}: SelectProps) => {
    const {t} = useTranslation();
    const [options, setOptions] = useState<{label: string, value: string}[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchAssetGroups = async () => {
            setLoading(true);
            try {
                const groups = await assetApi.getGroups();
                const flattenGroups = (nodes: any[]): any[] => {
                    let result: any[] = [];
                    nodes.forEach(node => {
                        if (node.key !== 'default') {
                            result.push({
                                label: node.title,
                                value: node.key,
                            });
                        }
                        if (node.children) {
                            result = result.concat(flattenGroups(node.children));
                        }
                    });
                    return result;
                };
                setOptions(flattenGroups(groups));
            } catch (error) {
                console.error('Failed to fetch asset groups:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAssetGroups();
    }, []);

    return (
        <Select
            value={value}
            onChange={onChange}
            placeholder={t('authorised.label.asset_group')}
            allowClear
            showSearch
            loading={loading}
            options={options}
            filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
            }
        />
    );
};

// 资产查询组件
export const AssetSelect = ({value, onChange}: SelectProps) => {
    const {t} = useTranslation();
    const [options, setOptions] = useState<{label: string, value: string}[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchAssets = async () => {
            setLoading(true);
            try {
                const result = await assetApi.getAll();
                const assetOptions = result.map((asset: Asset) => ({
                    label: asset.name,
                    value: asset.id,
                }));
                setOptions(assetOptions);
            } catch (error) {
                console.error('Failed to fetch assets:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAssets();
    }, []);

    return (
        <Select
            value={value}
            onChange={onChange}
            placeholder={t('menus.resource.submenus.asset')}
            allowClear
            showSearch
            loading={loading}
            options={options}
            filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
            }
        />
    );
};

// 网站组查询组件
export const WebsiteGroupSelect = ({value, onChange}: SelectProps) => {
    const {t} = useTranslation();
    const [options, setOptions] = useState<{label: string, value: string}[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchWebsiteGroups = async () => {
            setLoading(true);
            try {
                const groups = await websiteApi.getGroups();
                const flattenGroups = (nodes: any[]): any[] => {
                    let result: any[] = [];
                    nodes.forEach(node => {
                        if (node.key !== 'default') {
                            result.push({
                                label: node.title,
                                value: node.key,
                            });
                        }
                        if (node.children) {
                            result = result.concat(flattenGroups(node.children));
                        }
                    });
                    return result;
                };
                setOptions(flattenGroups(groups));
            } catch (error) {
                console.error('Failed to fetch website groups:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchWebsiteGroups();
    }, []);

    return (
        <Select
            value={value}
            onChange={onChange}
            placeholder={t('authorised.label.website_group')}
            allowClear
            showSearch
            loading={loading}
            options={options}
            filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
            }
        />
    );
};

// 数据库资产查询组件
export const DatabaseAssetSelect = ({value, onChange}: SelectProps) => {
    const {t} = useTranslation();
    const [options, setOptions] = useState<{label: string, value: string}[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchAssets = async () => {
            setLoading(true);
            try {
                const result = await databaseAssetApi.getAll();
                const assetOptions = result.map((asset: DatabaseAsset) => ({
                    label: asset.name,
                    value: asset.id,
                }));
                setOptions(assetOptions);
            } catch (error) {
                console.error('Failed to fetch database assets:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAssets();
    }, []);

    return (
        <Select
            value={value}
            onChange={onChange}
            placeholder={t('menus.resource.submenus.database_asset')}
            allowClear
            showSearch
            loading={loading}
            options={options}
            filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
            }
        />
    );
};

// 网站查询组件
export const WebsiteSelect = ({value, onChange}: SelectProps) => {
    const {t} = useTranslation();
    const [options, setOptions] = useState<{label: string, value: string}[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchWebsites = async () => {
            setLoading(true);
            try {
                const result = await websiteApi.getAll();
                const websiteOptions = result.map((website: Website) => ({
                    label: website.name,
                    value: website.id,
                }));
                setOptions(websiteOptions);
            } catch (error) {
                console.error('Failed to fetch websites:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchWebsites();
    }, []);

    return (
        <Select
            value={value}
            onChange={onChange}
            placeholder={t('menus.resource.submenus.website')}
            allowClear
            showSearch
            loading={loading}
            options={options}
            filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
            }
        />
    );
};
