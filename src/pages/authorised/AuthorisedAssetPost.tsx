import QuerySelect from "@/components/QuerySelect";
import {useEffect, useState} from "react";
import commandFilterApi from "@/api/command-filter-api";
import strategyApi from "@/api/strategy-api";
import {App, Checkbox, DatePicker, Form, Modal, Space, type CheckboxChangeEvent, type DatePickerProps} from "antd";
import dayjs from "dayjs";
import {useTranslation} from "react-i18next";
import authorisedAssetApi from "@/api/authorised-asset-api";
import {useNavigate} from "react-router-dom";
import {useMutation} from "@tanstack/react-query";
import {AssetGroupTreeSelect, AssetTreeSelect, DepartmentTreeSelect, UserSelect} from "@/components/shared/QuerySelects";
import {useLicense} from "@/hook/LicenseContext";

interface AuthorisedAssetPostProps {
    open?: boolean;
    onCancel?: () => void;
    onSuccess?: () => void;
}

const AuthorisedAssetPost = ({open, onCancel, onSuccess}: AuthorisedAssetPostProps) => {
    const [form] = Form.useForm();
    const {t} = useTranslation();
    const {message} = App.useApp();
    const [expiredAtDayjs, setExpiredAtDayjs] = useState<dayjs.Dayjs | null>();
    const [expiredAtNoLimit, setExpiredAtNoLimit] = useState<boolean>(true);
    const navigate = useNavigate();
    const modalOpen = open ?? true;
    const {license} = useLicense();
    const hasPremiumFeatures = license.hasPremiumFeatures();

    useEffect(() => {
        if (modalOpen) {
            setExpiredAtDayjs(dayjs(0));
            setExpiredAtNoLimit(true);
        }
    }, [modalOpen]);

    const postMutation = useMutation({
        mutationFn: (values: any) => authorisedAssetApi.post(values),
        onSuccess: () => {
            message.success(t("general.success"));
            form.resetFields();
            if (onSuccess) {
                onSuccess();
                return;
            }
            navigate("/authorised-asset");
        }
    });

    const handleNoTimeLimit = (e: CheckboxChangeEvent) => {
        setExpiredAtNoLimit(e.target.checked);
        if (e.target.checked === true) {
            setExpiredAtDayjs(dayjs(0));
        } else {
            setExpiredAtDayjs(dayjs());
        }
    };

    const handleTimeLimitChange = (date: dayjs.Dayjs | null) => {
        setExpiredAtDayjs(date);
    };

    const disabledDate: DatePickerProps["disabledDate"] = current => {
        // Can not select days before today and today
        return current && current < dayjs().endOf("day");
    };

    const handleCancel = () => {
        form.resetFields();
        if (onCancel) {
            onCancel();
            return;
        }
        navigate("/authorised-asset");
    };

    const handleSubmit = async (values: any) => {
        if (expiredAtDayjs) {
            values["expiredAt"] = expiredAtDayjs.valueOf();
        } else {
            values["expiredAt"] = 0;
        }
        postMutation.mutate(values);
    };

    return (
        <Modal
            title={t("menus.authorised.submenus.authorised_asset")}
            open={modalOpen}
            destroyOnHidden={true}
            onCancel={handleCancel}
            onOk={() => form.submit()}
            okText={t("actions.save")}
            confirmLoading={postMutation.isPending}
        >
            <Form
                form={form}
                layout="vertical"
                clearOnDestroy={true}
                onFinish={handleSubmit}
            >
                <Form.Item label={t("menus.identity.submenus.department")} name="departmentIds">
                    <DepartmentTreeSelect multiple />
                </Form.Item>

                <Form.Item label={t("menus.identity.submenus.user")} name="userIds">
                    <UserSelect mode="multiple" />
                </Form.Item>

                <Form.Item label={t("authorised.label.asset_group")} name="assetGroupIds">
                    <AssetGroupTreeSelect multiple />
                </Form.Item>

                <Form.Item label={t("menus.resource.submenus.asset")} name="assetIds">
                    <AssetTreeSelect multiple />
                </Form.Item>

                {hasPremiumFeatures && (
                    <>
                        <Form.Item label={t("menus.authorised.submenus.command_filter")} name="commandFilterId">
                            <QuerySelect
                                queryKey={['command-filters']}
                                showSearch={true}
                                request={async () => {
                                    const items = await commandFilterApi.getAll();
                                    return items.map(item => {
                                        return {
                                            label: item.name,
                                            value: item.id
                                        };
                                    });
                                }}
                            />
                        </Form.Item>

                        <Form.Item label={t("authorised.label.strategy")} name="strategyId">
                            <QuerySelect
                                queryKey={['strategies']}
                                showSearch={true}
                                request={async () => {
                                    const items = await strategyApi.getAll();
                                    return items.map(item => {
                                        return {
                                            label: item.name,
                                            value: item.id
                                        };
                                    });
                                }}
                            />
                        </Form.Item>
                    </>
                )}

                <Form.Item label={t("assets.limit_time")} name="expiredAt">
                    <Space>
                        <Checkbox onChange={handleNoTimeLimit} checked={expiredAtNoLimit}>
                            {t("authorised.label.never_expired")}
                        </Checkbox>
                        {!expiredAtNoLimit && (
                            <DatePicker
                                onChange={handleTimeLimitChange}
                                value={expiredAtDayjs}
                                format="YYYY-MM-DD HH:mm:ss"
                                disabledDate={disabledDate}
                                showTime={{
                                    defaultValue: dayjs("00:00:00", "HH:mm:ss")
                                }}
                            />
                        )}
                    </Space>
                </Form.Item>

            </Form>
        </Modal>
    );
};

export default AuthorisedAssetPost;
