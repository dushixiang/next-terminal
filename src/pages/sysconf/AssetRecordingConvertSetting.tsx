import {
    Alert,
    Button,
    Form,
    Radio,
    Switch,
    TimePicker,
} from "antd";
import {useTranslation} from "react-i18next";
import dayjs, {Dayjs} from "dayjs";
import {useMobile} from "@/hook/use-mobile";
import {cn} from "@/lib/utils";
import {useFormRequest} from "@/hook/use-antd-form-query";
import {SettingProps} from "./SettingPage";
import Disabled from "@/components/Disabled";
import {useLicense} from "@/hook/LicenseContext";

type TimeRange = [Dayjs, Dayjs];
const isTruthy = (value: any) => value === true || `${value}`.toLowerCase() === 'true';
const timeFormat = 'HH:mm';
const recordingConvertIdleTimeRangeField = 'recording-convert-idle-time-range';

const AssetRecordingConvertSetting = ({
                                          get,
                                          set
                                      }: SettingProps) => {
    const {isMobile} = useMobile();
    const {t} = useTranslation();
    const {license} = useLicense();
    const hasPremiumFeatures = license.hasPremiumFeatures();
    const [form] = Form.useForm();
    const recordingConvertEnabled = Form.useWatch('recording-convert-enabled', form);
    const recordingConvertMode = Form.useWatch('recording-convert-mode', form);
    const isRecordingConvertEnabled = isTruthy(recordingConvertEnabled);
    const isIdleRecordingConvert = recordingConvertMode === 'idle';

    const wrapGet = async () => {
        const values = await get();
        values['recording-convert-enabled'] = values['recording-convert-enabled'] === undefined
            ? true
            : isTruthy(values['recording-convert-enabled']);
        values['recording-convert-mode'] = values['recording-convert-mode'] || 'immediate';
        values['recording-convert-keep-raw'] = values['recording-convert-keep-raw'] === undefined
            ? false
            : isTruthy(values['recording-convert-keep-raw']);
        values[recordingConvertIdleTimeRangeField] = [
            dayjs(values['recording-convert-idle-start-time'] || '00:00', timeFormat),
            dayjs(values['recording-convert-idle-end-time'] || '06:00', timeFormat)
        ];
        return values;
    };

    const wrapSet = (values: any) => {
        const idleTimeRange = values[recordingConvertIdleTimeRangeField] as TimeRange | undefined;
        if (idleTimeRange?.length === 2) {
            values['recording-convert-idle-start-time'] = idleTimeRange[0].format(timeFormat);
            values['recording-convert-idle-end-time'] = idleTimeRange[1].format(timeFormat);
        }
        delete values[recordingConvertIdleTimeRangeField];
        if (!hasPremiumFeatures) {
            delete values['recording-convert-enabled'];
            delete values['recording-convert-mode'];
            delete values['recording-convert-idle-start-time'];
            delete values['recording-convert-idle-end-time'];
            delete values['recording-convert-keep-raw'];
        }
        return set(values);
    };

    useFormRequest(form, ["form-request", "web/src/pages/sysconf/AssetRecordingConvertSetting.tsx"], wrapGet, true);

    return <Form form={form} onFinish={wrapSet} layout="vertical">
        <Disabled feature="recording_conversion" disabled={!hasPremiumFeatures} className="mb-4">
            <div className={'flex items-start gap-2'}>
                <Form.Item name="recording-convert-enabled" label={t('settings.system.recording_convert.enabled')} required={true}
                           valuePropName="checked">
                    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
                </Form.Item>

                <Alert
                    type="info"
                    showIcon
                    title={t('settings.system.recording_convert.tip')}
                />
            </div>

            <div className={cn('flex gap-4', isMobile ? 'flex-col' : 'items-center flex-wrap')}>
                <Form.Item name="recording-convert-mode" label={t('settings.system.recording_convert.mode')} required={true}>
                    <Radio.Group disabled={!isRecordingConvertEnabled} options={[{
                        label: t('settings.system.recording_convert.immediate'),
                        value: 'immediate'
                    }, {
                        label: t('settings.system.recording_convert.idle'),
                        value: 'idle'
                    }]}/>
                </Form.Item>
                <Form.Item
                    name={recordingConvertIdleTimeRangeField}
                    label={t('settings.system.recording_convert.idle_time_range')}
                    extra={t('settings.system.recording_convert.idle_time_tip')}
                    required={isRecordingConvertEnabled && isIdleRecordingConvert}
                    rules={[{
                        required: isRecordingConvertEnabled && isIdleRecordingConvert,
                        message: t('settings.system.recording_convert.idle_time_required')
                    }]}
                >
                    <TimePicker.RangePicker
                        format={timeFormat}
                        minuteStep={5}
                        disabled={!isRecordingConvertEnabled || !isIdleRecordingConvert}
                        style={{width: isMobile ? '100%' : 240}}
                    />
                </Form.Item>
            </div>

            <Form.Item name="recording-convert-keep-raw" label={t('settings.system.recording_convert.keep_raw')} required={true}
                       valuePropName="checked">
                <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
            </Form.Item>

            <Form.Item>
                <Button type="primary" htmlType="submit">{t("actions.save")}</Button>
            </Form.Item>
        </Disabled>
    </Form>;
};

export default AssetRecordingConvertSetting;
