import {useEffect, useState} from "react";
import {App, Checkbox, DatePicker, Form, Modal, Space, type CheckboxChangeEvent, type DatePickerProps} from "antd";
import dayjs from "dayjs";
import {useTranslation} from "react-i18next";
import authorisedWebsiteApi from "@/api/authorised-website-api";
import {useNavigate} from "react-router-dom";
import {useMutation} from "@tanstack/react-query";
import {DepartmentTreeSelect, UserSelect, WebsiteGroupTreeSelect, WebsiteTreeSelect} from "@/components/shared/QuerySelects";

interface AuthorisedWebsitePostProps {
    open?: boolean;
    onCancel?: () => void;
    onSuccess?: () => void;
}

const AuthorisedWebsitePost = ({open, onCancel, onSuccess}: AuthorisedWebsitePostProps) => {
    const [form] = Form.useForm();
    const {t} = useTranslation();
    const {message} = App.useApp();
    const [expiredAtDayjs, setExpiredAtDayjs] = useState<dayjs.Dayjs | null>();
    const [expiredAtNoLimit, setExpiredAtNoLimit] = useState<boolean>(true);
    const navigate = useNavigate();
    const modalOpen = open ?? true;

    useEffect(() => {
        if (modalOpen) {
            setExpiredAtDayjs(undefined);
            setExpiredAtNoLimit(true);
        }
    }, [modalOpen]);

    const postMutation = useMutation({
        mutationFn: (values: any) => authorisedWebsiteApi.authorise(values),
        onSuccess: () => {
            message.success(t("general.success"));
            form.resetFields();
            if (onSuccess) {
                onSuccess();
                return;
            }
            navigate("/authorised-website");
        },
        onError: () => {
            message.error(t("authorised.authorise_failed"));
        }
    });

    const handleNoTimeLimit = (e: CheckboxChangeEvent) => {
        setExpiredAtNoLimit(e.target.checked);
        if (e.target.checked === true) {
            setExpiredAtDayjs(undefined);
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
        navigate("/authorised-website");
    };

    const handleSubmit = async (values: any) => {
        // 处理过期时间
        if (expiredAtNoLimit || !expiredAtDayjs) {
            values["expiredAt"] = 0; // 永不过期
        } else {
            values["expiredAt"] = expiredAtDayjs.valueOf();
        }
        postMutation.mutate(values);
    };

    return (
        <Modal
            title={t("authorised.website_title")}
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

                <Form.Item label={t("authorised.label.website_group")} name="websiteGroupIds">
                    <WebsiteGroupTreeSelect multiple />
                </Form.Item>

                <Form.Item label={t("menus.resource.submenus.website")} name="websiteIds">
                    <WebsiteTreeSelect multiple />
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

export default AuthorisedWebsitePost;
