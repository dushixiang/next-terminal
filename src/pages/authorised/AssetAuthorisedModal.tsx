import React, {useEffect, useRef, useState} from 'react';
import {ProForm, ProFormInstance, ProFormSelect} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {Checkbox, DatePicker, Form, Modal, Space} from "antd";
import authorisedAssetApi from "@/src/api/authorised-asset-api";
import commandFilterApi from "@/src/api/command-filter-api";
import strategyApi from "@/src/api/strategy-api";
import userApi from "@/src/api/user-api";
import userGroupApi from "@/src/api/user-group-api";
import strings from "@/src/utils/strings";
import dayjs from "dayjs";
import {RangePickerProps} from "antd/es/date-picker";

interface Props {
    open: boolean
    handleOk: (values: any) => void
    handleCancel: () => void
    confirmLoading: boolean
    assetId: string
    view: 'User' | 'UserGroup'
    id?: string
}

const AssetAuthorisedModal = ({assetId, open, handleOk, handleCancel, confirmLoading, view, id}: Props) => {
    const formRef = useRef<ProFormInstance>();
    let {t} = useTranslation();

    const [expiredAtDayjs, setExpiredAtDayjs] = useState<dayjs.Dayjs>();
    const [expiredAtNoLimit, setExpiredAtNoLimit] = useState<boolean>(true);

    const get = async () => {
        if (strings.hasText(id)) {
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

    const renderView = () => {
        if (strings.hasText(id)) {
            return undefined;
        }
        switch (view) {
            case "User":
                return <ProFormSelect
                    label={t('authorised.label.user')} name='userIds' rules={[{required: true}]}
                    fieldProps={{mode: 'multiple', showSearch: true}}
                    request={async () => {
                        let items = await userApi.getAll();
                        let selected = await authorisedAssetApi.selected('userId', '', '', assetId);
                        return items.map(item => {
                            return {
                                label: item.nickname,
                                value: item.id,
                                disabled: selected.includes(item.id)
                            }
                        });
                    }}
                />
            case "UserGroup":
                return <ProFormSelect
                    label={t('authorised.label.user_group')} name='userGroupIds' rules={[{required: true}]}
                    fieldProps={{mode: 'multiple', showSearch: true}}
                    request={async () => {
                        let items = await userGroupApi.getAll();
                        let selected = await authorisedAssetApi.selected('userGroupId', '', '', assetId);
                        return items.map(item => {
                            return {
                                label: item.name,
                                value: item.id,
                                disabled: selected.includes(item.id)
                            }
                        });
                    }}
                />
        }
    }

    return (
        <Modal
            title={t('actions.authorized')}
            open={open}
            maskClosable={false}
            destroyOnClose={true}
            onOk={() => {
                formRef.current?.validateFields()
                    .then(async values => {
                        values['id'] = id;
                        values['assetId'] = assetId;
                        if (expiredAtDayjs) {
                            values['expiredAt'] = expiredAtDayjs.valueOf();
                        }
                        handleOk(values);
                        formRef.current?.resetFields();
                    });
            }}
            onCancel={() => {
                formRef.current?.resetFields();
                handleCancel();
            }}
            confirmLoading={confirmLoading}
        >
            <ProForm formRef={formRef} request={get} submitter={false}>
                {renderView()}
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

export default AssetAuthorisedModal;