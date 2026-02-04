import React, {useRef, useState} from 'react';
import {ProForm, ProFormInstance, ProFormSelect} from "@ant-design/pro-components";
import {Checkbox, DatePicker, Form, message, Space} from "antd";
import dayjs from "dayjs";
import {useTranslation} from "react-i18next";
import userApi from "@/api/user-api";
import departmentApi from "@/api/department-api";
import {RangePickerProps} from "antd/es/date-picker";
import databaseAssetApi from "@/api/database-asset-api";
import authorisedDatabaseAssetApi from "@/api/authorised-database-asset-api";
import {useNavigate} from "react-router-dom";

const AuthorisedDatabaseAssetPost = () => {
    const formRef = useRef<ProFormInstance>(null);
    const {t} = useTranslation();
    const [expiredAtDayjs, setExpiredAtDayjs] = useState<dayjs.Dayjs>();
    const [expiredAtNoLimit, setExpiredAtNoLimit] = useState<boolean>(true);
    const navigate = useNavigate();

    const handleNoTimeLimit = (e) => {
        setExpiredAtNoLimit(e.target.checked);
        if (e.target.checked === true) {
            setExpiredAtDayjs(dayjs(0));
        } else {
            setExpiredAtDayjs(dayjs());
        }
    };

    const handleTimeLimitChange = (date) => {
        setExpiredAtDayjs(date);
    };

    const disabledDate: RangePickerProps['disabledDate'] = (current) => {
        return current && current < dayjs().endOf('day');
    };

    return (
        <div className={'px-4'}>
            <div className={'mb-4 font-bold text-lg'}>{t('menus.authorised.submenus.authorised_database_asset')}</div>
            <ProForm formRef={formRef} onFinish={async (values) => {
                if (expiredAtDayjs) {
                    values['expiredAt'] = expiredAtDayjs.valueOf();
                } else {
                    values['expiredAt'] = 0;
                }
                await authorisedDatabaseAssetApi.post(values);
                message.success(t('general.success'));
                formRef.current?.resetFields();
                navigate('/authorised-database-asset');
            }}>
                <ProFormSelect
                    label={t('menus.identity.submenus.user')} name='userIds'
                    fieldProps={{mode: 'multiple', showSearch: true}}
                    request={async () => {
                        const items = await userApi.getAll();
                        return items.map(item => ({
                            label: item.nickname,
                            value: item.id,
                        }));
                    }}
                />
                <ProFormSelect
                    label={t('menus.identity.submenus.department')} name='departmentIds'
                    fieldProps={{mode: 'multiple', showSearch: true}}
                    request={async () => {
                        const items = await departmentApi.getAll();
                        return items.map(item => ({
                            label: item.name,
                            value: item.id,
                        }));
                    }}
                />

                <ProFormSelect
                    label={t('menus.resource.submenus.database_asset')}
                    name='assetIds'
                    fieldProps={{
                        mode: 'multiple',
                        showSearch: true,
                    }}
                    request={async () => {
                        const items = await databaseAssetApi.getAll();
                        return items.map(item => ({
                            label: item.name,
                            value: item.id,
                        }));
                    }}
                />

                <Form.Item label={t('assets.limit_time')} name="expiredAt">
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
                                        showTime={{defaultValue: dayjs('00:00:00', 'HH:mm:ss')}}
                            />
                        }
                    </Space>
                </Form.Item>
            </ProForm>
        </div>
    );
};

export default AuthorisedDatabaseAssetPost;
