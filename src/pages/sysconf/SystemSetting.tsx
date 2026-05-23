import React, {useState} from 'react';
import {
    Button,
    Checkbox,
    ColorPicker,
    ColorPickerProps,
    Divider,
    Form,
    Image,
    Input,
    Radio,
    Slider,
    Switch,
    theme,
    Typography
} from "antd";
import {SettingProps} from "./SettingPage";
import {useTranslation} from "react-i18next";
import {generate, green, presetPalettes, red} from '@ant-design/colors';
import {Color} from "antd/es/color-picker";
import {useLicense} from "@/hook/LicenseContext";
import Disabled from "@/components/Disabled";
import {Upload as UploadIcon} from 'lucide-react';
import {useMobile} from "@/hook/use-mobile";
import {cn} from "@/lib/utils";
import {useFormRequest} from "@/hook/use-antd-form-query";

const {
    Title,
    Text
} = Typography;
type Presets = Required<ColorPickerProps>['presets'][number];
const genPresets = (presets = presetPalettes) => Object.entries(presets).map<Presets>(([label, colors]) => ({
    label,
    colors
}));
const isTruthy = (value: any) => value === true || `${value}`.toLowerCase() === 'true';

const SystemSetting = ({
                           get,
                           set
                       }: SettingProps) => {
    const {
        isMobile
    } = useMobile();
    let {
        t
    } = useTranslation();
    let [logo, setLogo] = useState<string>();
    let [loginBackgroundImg, setLoginBackgroundImg] = useState<string>();
    let [watermarkFontColor, setWatermarkFontColor] = useState('');
    let [loginBackgroundColor, setLoginBackgroundColor] = useState('');
    let [enabled, setEnabled] = useState(false);
    const [form] = Form.useForm();
    let {
        license
    } = useLicense();

    const wrapGet = async () => {
        let values = await get();
        setLogo(values['system-logo']);
        setWatermarkFontColor(values['watermark-font-color']);
        setEnabled(isTruthy(values['watermark-enabled']));
        setLoginBackgroundImg(values['system-login-background-image']);
        setLoginBackgroundColor(values['system-login-background-color']);
        return values;
    };

    const wrapSet = (values: any) => {
        values['system-logo'] = logo;
        values['watermark-font-color'] = watermarkFontColor;
        values['system-login-background-image'] = loginBackgroundImg;
        values['system-login-background-color'] = loginBackgroundColor;
        return set(values);
    };

    const handleUploadRequest = ({
                                     file,
                                     onSuccess
                                 }: any) => {
        //声明js的文件流
        const reader = new FileReader();
        if (file) {
            //通过文件流将文件转换成Base64字符串
            reader.readAsDataURL(file);
            //转换成功后
            reader.onloadend = function () {
                //输出结果
                let imgBase64 = reader.result as string;
                onSuccess(imgBase64);
            };
        }
    };
    const fileInputChange = (event: any) => {
        let file = event.target.files[0];
        handleUploadRequest({
            file,
            onSuccess: (imgBase64: string) => {
                setLogo(imgBase64);
                form.setFieldValue('system-logo', imgBase64);
            }
        });
    };
    const {
        token
    } = theme.useToken();
    const presets = genPresets({
        primary: generate(token.colorPrimary),
        red,
        green
    });
    useFormRequest(form, ["form-request", "web/src/pages/sysconf/SystemSetting.tsx"], wrapGet, true);

    return <div>
        <Title level={5} style={{marginTop: 0}}>{t('menus.setting.label')}</Title>

        <Form form={form} onFinish={wrapSet} layout="vertical">
            <Divider titlePlacement="left">{t('settings.system.basic_info_title')}</Divider>
            <Disabled disabled={license.isFree()}>
                <div className={cn('flex gap-4', isMobile ? 'flex-col items-center' : 'items-start')}>
                    <div className={cn(isMobile && 'w-full flex justify-center')}>
                        <Form.Item name="system-logo" label={t('settings.system.logo')} rules={[{
                            required: true
                        }]}>
                            <div className="logo-upload-container">
                                <input id={'file'} type={'file'} accept={'.png,.jpg,.jpeg'} style={{
                                    display: "none"
                                }} onChange={fileInputChange}/>
                                <div onClick={() => {
                                    const fileDom = document.getElementById('file');
                                    fileDom?.click();
                                }}
                                     className={cn("logo-preview border border-dashed border-gray-300 rounded-md p-3 cursor-pointer hover:border-blue-400 transition-colors flex flex-col items-center justify-center", isMobile ? "w-24 h-24" : "w-20 h-20")}>
                                    {logo ? <Image className="w-full h-full object-contain" src={logo} alt="logo"
                                                   preview={false}/> :
                                        <div className="flex flex-col items-center gap-1 text-gray-400">
                                            <UploadIcon size={16}/>
                                            <Text type="secondary" className="text-xs">{t('general.upload')}</Text>
                                        </div>}
                                </div>
                            </div>
                        </Form.Item>
                    </div>
                    <div className={cn(isMobile && 'w-full')}>
                        <div className={cn('flex gap-4', isMobile ? 'flex-col' : 'items-center')}>
                            <Form.Item name="system-name" label={t('settings.system.name')} rules={[{
                                required: true
                            }]}>
                                <Input style={{
                                    width: isMobile ? 'xl' : undefined
                                }}/>
                            </Form.Item>
                            <Form.Item name="system-icp" label={t('settings.system.icp')}>
                                <Input style={{
                                    width: isMobile ? 'xl' : undefined
                                }}/>
                            </Form.Item>
                        </div>
                        <div>
                            <Form.Item name="system-copyright" label={t('settings.system.copyright')} rules={[{
                                required: true
                            }]}>
                                <Input style={{
                                    width: 'xl'
                                }}/>
                            </Form.Item>
                        </div>
                    </div>
                </div>

            </Disabled>

            <Divider titlePlacement="left">{t('settings.system.asset_access.setting')}</Divider>
            <Form.Item name="asset-access-mode" label={t('settings.system.asset_access.mode')} rules={[{
                required: true
            }]}>
                <Radio.Group options={[{
                    label: t('settings.system.asset_access.access_page'),
                    value: 'access-page'
                }, {
                    label: t('settings.system.asset_access.standalone_page'),
                    value: 'standalone-page'
                }]}/>
            </Form.Item>

            <Divider titlePlacement="left">{t('settings.system.watermark.setting')}</Divider>
            <Disabled disabled={license.isFree()}>
                <Form.Item name="watermark-enabled" label={t("identity.user.watermark")} required={true} valuePropName="checked">
                    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')} onChange={setEnabled} />
                </Form.Item>
                <div className={cn('flex gap-4', isMobile ? 'flex-col' : 'items-center flex-wrap')}>
                    <Form.Item name="watermark-content" label={t('settings.system.watermark.content')} required={true}>
                        <Input disabled={!enabled} style={{
                            width: isMobile ? 'xl' : undefined
                        }}/>
                    </Form.Item>
                    <div className={cn('flex gap-4', isMobile ? 'flex-col' : 'items-center')}>
                        <Form.Item
                            name="watermark-content-user-account"
                            label={t('settings.system.watermark.append_user')}
                            valuePropName="checked"
                        >
                            <Checkbox disabled={!enabled}/>
                        </Form.Item>
                        <Form.Item
                            name="watermark-content-asset-username"
                            label={t('settings.system.watermark.append_asset')}
                            valuePropName="checked"
                        >
                            <Checkbox disabled={!enabled}/>
                        </Form.Item>
                    </div>
                    <Form.Item name="watermark-font-color" label={t('settings.system.watermark.font_color')} required={true}>
                        <ColorPicker disabled={!enabled} presets={presets} onChange={(color: Color) => {
                            let rgba = color.toRgb();
                            setWatermarkFontColor(`rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`);
                        }}/>
                    </Form.Item>
                </div>

                <div className={cn(isMobile ? 'w-full' : 'w-1/2')}>
                    <Form.Item name="watermark-font-size" label={t('settings.system.watermark.font_size')} required={true}>
                        <Slider disabled={!enabled} min={1} max={100}/>
                    </Form.Item>
                </div>
            </Disabled>

            <Form.Item>
                <Button type="primary" htmlType="submit">{t("actions.save")}</Button>
            </Form.Item>
        </Form>
    </div>;
};
export default SystemSetting;
