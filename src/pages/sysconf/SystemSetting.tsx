import React, {useState} from 'react';
import {ColorPicker, ColorPickerProps, Divider, Form, Image, theme, Typography} from "antd";
import {SettingProps} from "./SettingPage";
import {ProForm, ProFormCheckbox, ProFormSlider, ProFormSwitch, ProFormText} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {generate, green, presetPalettes, red} from '@ant-design/colors';
import {Color} from "antd/es/color-picker";
import {useLicense} from "@/hook/use-license";
import Disabled from "@/components/Disabled";
import {Upload as UploadIcon} from 'lucide-react';
import {useMobile} from "@/hook/use-mobile";
import {cn} from "@/lib/utils";

const {Title, Text} = Typography;

type Presets = Required<ColorPickerProps>['presets'][number];

const genPresets = (presets = presetPalettes) =>
    Object.entries(presets).map<Presets>(([label, colors]) => ({label, colors}));

const SystemSetting = ({get, set}: SettingProps) => {

    const { isMobile } = useMobile();
    let {t} = useTranslation();
    let [logo, setLogo] = useState<string>();
    let [loginBackgroundImg, setLoginBackgroundImg] = useState<string>();
    let [watermarkFontColor, setWatermarkFontColor] = useState('');
    let [loginBackgroundColor, setLoginBackgroundColor] = useState('');
    let [enabled, setEnabled] = useState(false);


    let [license] = useLicense();

    const wrapGet = async () => {
        let values = await get();
        setLogo(values['system-logo']);
        setWatermarkFontColor(values['watermark-font-color']);
        setEnabled(values['watermark-enabled']);
        setLoginBackgroundImg(values['system-login-background-image']);
        setLoginBackgroundColor(values['system-login-background-color']);
        return values;
    }

    const wrapSet = (values: any) => {
        values['system-logo'] = logo;
        values['watermark-font-color'] = watermarkFontColor;
        values['system-login-background-image'] = loginBackgroundImg;
        values['system-login-background-color'] = loginBackgroundColor;
        return set(values);
    }

    const handleUploadRequest = ({file, onSuccess}: any) => {
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
            }
        }
    }

    const fileInputChange = (event: any) => {
        let file = event.target.files[0];
        handleUploadRequest({
            file, onSuccess: (imgBase64: string) => {
                setLogo(imgBase64);
            }
        });
    }

    const {token} = theme.useToken();
    const presets = genPresets({primary: generate(token.colorPrimary), red, green});

    return (
        <div>
            <Title level={5} style={{marginTop: 0}}>{t('settings.system.setting')}</Title>

            <ProForm
                onFinish={wrapSet}
                request={wrapGet}
                submitter={{
                    resetButtonProps: {
                        style: {display: 'none'}
                    }
                }}
            >
                <Divider orientation="left">系统基本信息</Divider>
                <Disabled disabled={license.isFree()}>
                    <div className={cn(
                        'flex gap-4',
                        isMobile ? 'flex-col items-center' : 'items-start'
                    )}>
                        <div className={cn(isMobile && 'w-full flex justify-center')}>
                            <Form.Item
                                name="system-logo"
                                label={t('settings.system.logo')}
                                rules={[{required: true}]}
                            >
                                <div className="logo-upload-container">
                                    <input
                                        id={'file'}
                                        type={'file'}
                                        accept={'.png,.jpg,.jpeg'}
                                        style={{display: "none"}}
                                        onChange={fileInputChange}
                                    />
                                    <div
                                        onClick={() => {
                                            const fileDom = document.getElementById('file');
                                            fileDom?.click();
                                        }}
                                        className={cn(
                                            "logo-preview border border-dashed border-gray-300 rounded-md p-3 cursor-pointer hover:border-blue-400 transition-colors flex flex-col items-center justify-center",
                                            isMobile ? "w-24 h-24" : "w-20 h-20"
                                        )}
                                    >
                                        {logo ? (
                                            <Image
                                                className="w-full h-full object-contain"
                                                src={logo}
                                                alt="logo"
                                                preview={false}
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 text-gray-400">
                                                <UploadIcon size={16}/>
                                                <Text type="secondary" className="text-xs">上传</Text>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Form.Item>
                        </div>
                        <div className={cn(isMobile && 'w-full')}>
                            <div className={cn(
                                'flex gap-4',
                                isMobile ? 'flex-col' : 'items-center'
                            )}>
                                <ProFormText
                                    name="system-name"
                                    label={t('settings.system.name')}
                                    rules={[{required: true}]}
                                    width={isMobile ? 'xl' : undefined}
                                />
                                <ProFormText
                                    name="system-icp"
                                    label={t('settings.system.icp')}
                                    width={isMobile ? 'xl' : undefined}
                                />
                            </div>
                            <div>
                                <ProFormText
                                    name="system-copyright"
                                    label={t('settings.system.copyright')}
                                    rules={[{required: true}]}
                                    width={'xl'}
                                />
                            </div>
                        </div>
                    </div>

                </Disabled>

                <Divider orientation="left">{t('settings.system.watermark.setting')}</Divider>
                <Disabled disabled={license.isFree()}>
                    <ProFormSwitch
                        name="watermark-enabled"
                        label={t("settings.system.watermark.status")}
                        rules={[{required: true}]}
                        checkedChildren={t('general.enabled')}
                        unCheckedChildren={t('general.disabled')}
                        fieldProps={{
                            checked: enabled,
                            onChange: setEnabled,
                        }}
                    />
                    <div className={cn(
                        'flex gap-4',
                        isMobile ? 'flex-col' : 'items-center flex-wrap'
                    )}>
                        <ProFormText
                            name="watermark-content"
                            label={t('settings.system.watermark.content')}
                            rules={[{required: true}]}
                            disabled={!enabled}
                            width={isMobile ? 'xl' : undefined}
                        />
                        <div className={cn(
                            'flex gap-4',
                            isMobile ? 'flex-col' : 'items-center'
                        )}>
                            <ProFormCheckbox
                                name="watermark-content-user-account"
                                label={t('settings.system.watermark.append.user')}
                                disabled={!enabled}
                            />
                            <ProFormCheckbox
                                name="watermark-content-asset-username"
                                label={t('settings.system.watermark.append.asset')}
                                disabled={!enabled}
                            />
                        </div>
                        <Form.Item
                            name="watermark-font-color"
                            label={t('settings.system.watermark.font.color')}
                            rules={[{required: true}]}
                        >
                            <ColorPicker
                                disabled={!enabled}
                                presets={presets}
                                onChange={(color: Color) => {
                                    let rgba = color.toRgb();
                                    setWatermarkFontColor(`rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`);
                                }}
                            />
                        </Form.Item>
                    </div>

                    <div className={cn(isMobile ? 'w-full' : 'w-1/2')}>
                        <ProFormSlider
                            name="watermark-font-size"
                            label={t('settings.system.watermark.font.size')}
                            rules={[{required: true}]}
                            min={1}
                            max={100}
                            disabled={!enabled}
                            marks={{
                                1: '小',
                                25: '中',
                                50: '大',
                                100: '特大'
                            }}
                        />
                    </div>
                </Disabled>
            </ProForm>
        </div>
    );
};

export default SystemSetting;