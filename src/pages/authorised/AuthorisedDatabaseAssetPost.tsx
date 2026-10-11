import authorisedDatabaseAssetApi from "@/api/authorised-database-asset-api";
import dayjs from "dayjs";
import {useEffect, useState} from "react";
import {App, Checkbox, DatePicker, Form, Modal, Space, type CheckboxChangeEvent, type DatePickerProps} from "antd";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useMutation} from "@tanstack/react-query";
import {DatabaseAssetSelect, DepartmentTreeSelect, UserSelect} from "@/components/shared/QuerySelects";

interface AuthorisedDatabaseAssetPostProps {
    open?: boolean;
    onCancel?: () => void;
    onSuccess?: () => void;
}

const AuthorisedDatabaseAssetPost = ({open, onCancel, onSuccess}: AuthorisedDatabaseAssetPostProps) => {
    const [form] = Form.useForm();
    const {t} = useTranslation();
    const {message} = App.useApp();
    const [expiredAtDayjs, setExpiredAtDayjs] = useState<dayjs.Dayjs | null>();
    const [expiredAtNoLimit, setExpiredAtNoLimit] = useState<boolean>(true);
    const navigate = useNavigate();
    const modalOpen = open ?? true;

    useEffect(() => {
        if (modalOpen) {
            setExpiredAtDayjs(dayjs(0));
            setExpiredAtNoLimit(true);
        }
    }, [modalOpen]);

    const postMutation = useMutation({
        mutationFn: (values: any) => authorisedDatabaseAssetApi.post(values),
        onSuccess: () => {
            message.success(t("general.success"));
            form.resetFields();
            if (onSuccess) {
                onSuccess();
                return;
            }
            navigate("/authorised-database-asset");
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
        return current && current < dayjs().endOf("day");
    };

    const handleCancel = () => {
        form.resetFields();
        if (onCancel) {
            onCancel();
            return;
        }
        navigate("/authorised-database-asset");
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
            title={t("menus.authorised.submenus.authorised_database_asset")}
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

                <Form.Item label={t("menus.resource.submenus.database_asset")} name="assetIds">
                    <DatabaseAssetSelect mode="multiple" />
                </Form.Item>

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

export default AuthorisedDatabaseAssetPost;
