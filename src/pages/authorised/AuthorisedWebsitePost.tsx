import React, {useEffect, useRef, useState} from 'react';
import {ProForm, ProFormInstance, ProFormSelect, ProFormTreeSelect} from "@ant-design/pro-components";
import {Checkbox, DatePicker, Form, message, Space} from "antd";
import dayjs from "dayjs";
import {useTranslation} from "react-i18next";
import userApi from "@/src/api/user-api";
import departmentApi from "@/src/api/department-api";
import {RangePickerProps} from "antd/es/date-picker";
import websiteApi from "@/src/api/website-api";
import authorisedWebsiteApi from "@/src/api/authorised-website-api";
import {useNavigate} from "react-router-dom";

const AuthorisedWebsitePost = () => {
    const formRef = useRef<ProFormInstance>();
    let {t} = useTranslation();
    const [expiredAtDayjs, setExpiredAtDayjs] = useState<dayjs.Dayjs>();
    const [expiredAtNoLimit, setExpiredAtNoLimit] = useState<boolean>(true);
    let navigate = useNavigate();

    useEffect(() => {
        setExpiredAtDayjs(undefined);
        setExpiredAtNoLimit(true);
    }, []);

    const handleNoTimeLimit = (e) => {
        setExpiredAtNoLimit(e.target.checked);
        if (e.target.checked === true) {
            setExpiredAtDayjs(undefined);
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
            <div className={'mb-4 font-bold text-lg'}>授权网站</div>
            <ProForm formRef={formRef} onFinish={async (values) => {
                // 处理过期时间
                if (expiredAtNoLimit || !expiredAtDayjs) {
                    values['expiredAt'] = 0; // 永不过期
                } else {
                    values['expiredAt'] = expiredAtDayjs.valueOf();
                }
                
                try {
                    await authorisedWebsiteApi.authorise(values);
                    message.success(t('general.success'));
                    formRef.current?.resetFields();
                    navigate('/authorised-website');
                } catch (error) {
                    message.error('授权失败');
                }
            }}>
                <ProFormSelect
                    label={t('authorised.label.user')} 
                    name='userIds'
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
                    label={t('authorised.label.department')} 
                    name='departmentIds'
                    fieldProps={{showSearch: true, multiple: true, treeDefaultExpandAll: true}}
                    request={async () => {
                        let items = await departmentApi.getTree();
                        return items;
                    }}
                />

                <ProFormTreeSelect
                    label={t('authorised.label.website_group')}
                    name='websiteGroupIds'
                    fieldProps={{
                        multiple: true,
                        showSearch: true,
                        treeDefaultExpandAll: true,
                        treeNodeFilterProp: "title",
                    }}
                    request={async () => {
                        let items = await websiteApi.getGroups();
                        // 递归把 key 字段设置为 value，并且非叶子节点全部 disabled
                        function setKeyAndDisabled(item: any) {
                            item.value = item.key;
                            if (!item.isLeaf) {
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

                <ProFormTreeSelect
                    label="网站"
                    name='websiteIds'
                    fieldProps={{
                        multiple: true,
                        showSearch: true,
                        treeDefaultExpandAll: true,
                        treeNodeFilterProp: "title",
                    }}
                    request={async () => {
                        let items = await websiteApi.getAll();
                        
                        // 转换为树形结构
                        return items.map((item: any) => ({
                            title: item.name + ' (' + item.targetUrl + ')',
                            key: item.id,
                            value: item.id,
                            isLeaf: true,
                        }));
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
                                        showTime={{defaultValue: dayjs('00:00:00', 'HH:mm:ss')}}
                            />
                        }
                    </Space>
                </Form.Item>
            </ProForm>
        </div>
    );
};

export default AuthorisedWebsitePost;