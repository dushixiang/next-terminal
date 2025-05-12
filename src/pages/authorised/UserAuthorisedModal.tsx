import React, {useEffect, useRef, useState} from 'react';
import {Checkbox, DatePicker, Form, Modal, Space} from "antd";
import {ProForm, ProFormInstance, ProFormSelect, ProFormTreeSelect} from '@ant-design/pro-components';
import {useTranslation} from "react-i18next";
import assetApi from "@/src/api/asset-api";
import commandFilterApi from "@/src/api/command-filter-api";
import strategyApi from "@/src/api/strategy-api";
import authorisedAssetApi from "@/src/api/authorised-asset-api";
import strings from "@/src/utils/strings";
import dayjs from "dayjs";
import {RangePickerProps} from "antd/es/date-picker";

interface Props {
    open: boolean
    handleOk: (values: any) => void
    handleCancel: () => void
    confirmLoading: boolean
    userId?: string
    userGroupId?: string
    id?: string
}

const UserAuthorisedModal = ({userId, userGroupId, open, handleOk, handleCancel, confirmLoading,id}: Props) => {

    const formRef = useRef<ProFormInstance>();
    let {t} = useTranslation();

    const [expiredAtDayjs, setExpiredAtDayjs] = useState<dayjs.Dayjs>();
    const [expiredAtNoLimit, setExpiredAtNoLimit] = useState<boolean>(true);

    const get = async () => {
        if(strings.hasText(id)){
            let data = await authorisedAssetApi.getById(id);
            setExpiredAtNoLimit(data.expiredAt === 0);
            setExpiredAtDayjs(dayjs(data.expiredAt));
            return data;
        }
        return {}
    }

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

    const renderAsset = () => {
        if(strings.hasText(id)){
            return undefined;
        }
        return <ProFormTreeSelect
            label={t('authorised.label.asset')}
            name='assetIds'
            rules={[{required: true}]}
            fieldProps={{
                multiple: true,
                showSearch: true,
                treeDefaultExpandAll: true,
            }}
            request={async () => {
                let items = await assetApi.tree();

                // 递归把 key 字段设置为 value，并且非叶子节点全部 disabled
                function setKeyAndDisabled(item: any) {
                    item.value = item.key;
                    if (!item.isLeaf) {
                        item.disabled = true;
                        // 递归处理子节点
                        if (item.children) {
                            item.children.forEach(setKeyAndDisabled);
                        }
                    }
                }
                // 对获取到的所有节点进行处理
                items.forEach((item: any) => {
                    setKeyAndDisabled(item);
                });
                return items;
            }}
        />
    }

    return (
        <Modal
            title={t('actions.authorized')}
            open={open}
            maskClosable={false}
            destroyOnHidden={true}
            onOk={() => {
                formRef.current?.validateFields()
                    .then(async values => {
                        values['id'] = id;
                        values['userId'] = userId;
                        values['userGroupId'] = userGroupId;
                        if (expiredAtDayjs) {
                            values['expiredAt'] = expiredAtDayjs.valueOf();
                        }
                        handleOk(values);
                        
                    });
            }}
            onCancel={() => {
                
                handleCancel();
            }}
            confirmLoading={confirmLoading}
        >
            <ProForm formRef={formRef} request={get} submitter={false}>
                {renderAsset()}
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
        </Modal>
    )
};

export default UserAuthorisedModal;