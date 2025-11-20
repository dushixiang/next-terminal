import React, {useEffect, useRef, useState} from 'react';
import {ProForm, ProFormInstance, ProFormSelect, ProFormTreeSelect} from "@ant-design/pro-components";
import commandFilterApi from "@/api/command-filter-api";
import strategyApi from "@/api/strategy-api";
import {Checkbox, DatePicker, Form, message, Space} from "antd";
import dayjs from "dayjs";
import {useTranslation} from "react-i18next";
import userApi from "@/api/user-api";
import departmentApi from "@/api/department-api";
import {RangePickerProps} from "antd/es/date-picker";
import assetApi from "@/api/asset-api";
import authorisedAssetApi from "@/api/authorised-asset-api";
import {useNavigate} from "react-router-dom";

const AuthorisedAssetPost = () => {
    const formRef = useRef<ProFormInstance>();
    let {t} = useTranslation();
    const [expiredAtDayjs, setExpiredAtDayjs] = useState<dayjs.Dayjs>();
    const [expiredAtNoLimit, setExpiredAtNoLimit] = useState<boolean>(true);
    let navigate = useNavigate();

    useEffect(() => {
        if (!open) {
            setExpiredAtDayjs(undefined);
            setExpiredAtNoLimit(true);
        }
    }, [open]);

    const handleNoTimeLimit = (e) => {
        setExpiredAtNoLimit(e.target.checked);
        if (e.target.checked === true) {
            setExpiredAtDayjs(dayjs(0));
        } else {
            setExpiredAtDayjs(dayjs());
        }
    }

    const handleTimeLimitChange = (date, dateString) => {
        console.log(date, dateString);
        setExpiredAtDayjs(date);
    }

    const disabledDate: RangePickerProps['disabledDate'] = (current) => {
        // Can not select days before today and today
        return current && current < dayjs().endOf('day');
    };

    return (
        <div className={'px-4'}>
            <div className={'mb-4 font-bold text-lg'}>授权资产</div>
            <ProForm formRef={formRef} onFinish={async (values) => {
                if (expiredAtDayjs) {
                    values['expiredAt'] = expiredAtDayjs.valueOf();
                } else {
                    values['expiredAt'] = 0;
                }
                await authorisedAssetApi.post(values);
                message.success(t('general.success'));
                formRef.current?.resetFields();
                navigate('/authorised-asset')
            }}>
                <ProFormSelect
                    label={t('authorised.label.user')} name='userIds'
                    fieldProps={{mode: 'multiple', showSearch: true}}
                    request={async () => {
                        let items = await userApi.getAll();
                        return items.map(item => {
                            return {
                                label: item.nickname,
                                value: item.id,
                            }
                        });
                    }}
                />
                <ProFormTreeSelect
                    label={t('authorised.label.department')} name='departmentIds'
                    fieldProps={{showSearch: true, multiple: true, treeDefaultExpandAll: true}}
                    request={async () => {
                        let items = await departmentApi.getTree();
                        // let selected = await authorisedAssetApi.selected('departmentId', '', '', assetId);
                        return items;
                    }}
                />

                <ProFormTreeSelect
                    label={t('authorised.label.asset_group')}
                    name='assetGroupIds'
                    fieldProps={{
                        multiple: true,
                        showSearch: true,
                        treeDefaultExpandAll: true,
                        treeNodeFilterProp: "title",
                    }}
                    request={async () => {
                        let items = await assetApi.getGroups();
                        // let selected = await authorisedAssetApi.selected('assetId', userId, userGroupId, '');
                        // 递归把 key 字段设置为 value，并且非叶子节点全部 disabled
                        function setKeyAndDisabled(item: any) {
                            item.value = item.key;
                            if (!item.isLeaf) {
                                // 递归处理子节点
                                if (item.children) {
                                    item.children.forEach(setKeyAndDisabled);
                                }
                            }
                            // if (selected.includes(item.key)) {
                            //     item.disabled = true;
                            // }
                        }

                        // 对获取到的所有节点进行处理
                        items.forEach((item: any) => {
                            setKeyAndDisabled(item);
                        });
                        return items;
                    }}
                />

                <ProFormTreeSelect
                    label={t('authorised.label.asset')}
                    name='assetIds'
                    fieldProps={{
                        multiple: true,
                        showSearch: true,
                        treeDefaultExpandAll: true,
                        treeNodeFilterProp: "title",
                    }}
                    request={async () => {
                        let items = await assetApi.tree();
                        // let selected = await authorisedAssetApi.selected('assetId', userId, userGroupId, '');

                        // 递归把 key 字段设置为 value，并且非叶子节点全部 disabled
                        function setKeyAndDisabled(item: any) {
                            item.value = item.key;
                            if (!item.isLeaf) {
                                item.disabled = true;
                                // 递归处理子节点
                                if (item.children) {
                                    item.children.forEach(setKeyAndDisabled);
                                }
                            } else {
                                item.title = item.title + ' (' + item.extra?.network + ')';
                            }
                            // if (selected.includes(item.key)) {
                            //     item.disabled = true;
                            // }
                        }

                        // 对获取到的所有节点进行处理
                        items.forEach((item: any) => {
                            setKeyAndDisabled(item);
                        });
                        return items;
                    }}
                />

                <ProFormSelect
                    label={t('authorised.label.command_filter')} name='commandFilterId'
                    fieldProps={{showSearch: true}}
                    request={async () => {
                        let items = await commandFilterApi.getAll();
                        return items.map(item => {
                            return {
                                label: item.name,
                                value: item.id,
                            }
                        });
                    }}
                />

                <ProFormSelect
                    label={t('authorised.label.strategy')} name='strategyId'
                    fieldProps={{showSearch: true}}
                    request={async () => {
                        let items = await strategyApi.getAll();
                        return items.map(item => {
                            return {
                                label: item.name,
                                value: item.id,
                            }
                        });
                    }}
                />

                <Form.Item label={t('authorised.label.expired_at')} name="expiredAt">
                    <Space>
                        <Checkbox onChange={handleNoTimeLimit}
                                  checked={expiredAtNoLimit}>
                            {t('authorised.label.never_expired')}
                        </Checkbox>
                        {!expiredAtNoLimit &&
                            <DatePicker onChange={handleTimeLimitChange}
                                        value={expiredAtDayjs}
                                        format="YYYY-MM-DD HH:mm:ss"
                                        disabledDate={disabledDate}
                                // disabledTime={disabledDateTime}
                                        showTime={{defaultValue: dayjs('00:00:00', 'HH:mm:ss')}}
                            />
                        }
                    </Space>
                </Form.Item>
            </ProForm>
        </div>
    );
};

export default AuthorisedAssetPost;