import React, {useState} from 'react';
import {Col, ColorPicker, ColorPickerProps, Divider, Form, Row, theme, Typography} from "antd";
import {SettingProps} from "./SettingPage";
import {
    ProForm,
    ProFormCheckbox,
    ProFormDependency,
    ProFormDigit,
    ProFormSelect,
    ProFormSlider,
    ProFormSwitch,
    ProFormText
} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {generate, green, presetPalettes, red} from '@ant-design/colors';
import {Color} from "antd/es/color-picker";
import {useLicense} from "@/src/hook/use-license";
import Disabled from "@/src/components/Disabled";

const {Title} = Typography;

type Presets = Required<ColorPickerProps>['presets'][number];

const cidrRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/([1-9]|1[0-9]|2[0-9]|3[0-2])$/;

const genPresets = (presets = presetPalettes) =>
    Object.entries(presets).map<Presets>(([label, colors]) => ({label, colors}));

const SystemSetting = ({get, set}: SettingProps) => {

    let {t} = useTranslation();
    let [logo, setLogo] = useState<string>();
    let [loginBackgroundImg, setLoginBackgroundImg] = useState<string>();
    let [watermarkFontColor, setWatermarkFontColor] = useState('');
    let [loginBackgroundColor, setLoginBackgroundColor] = useState('');
    let [enabled, setEnabled] = useState(false);

    let [ipTrustList, setIpTrustList] = useState<string[]>([]);
    let [license] = useLicense();

    const wrapGet = async () => {
        let values = await get();
        setLogo(values['system-logo']);
        setWatermarkFontColor(values['watermark-font-color']);
        setEnabled(values['watermark-enabled']);
        setLoginBackgroundImg(values['system-login-background-image']);
        setLoginBackgroundColor(values['system-login-background-color']);
        if (values['ip-trust-list']) {
            let parts = values['ip-trust-list'].split(',');
            setIpTrustList(parts);
        }
        return values;
    }

    const wrapSet = (values: any) => {
        values['system-logo'] = logo;
        values['watermark-font-color'] = watermarkFontColor;
        values['system-login-background-image'] = loginBackgroundImg;
        values['system-login-background-color'] = loginBackgroundColor;
        values['ip-trust-list'] = ipTrustList.join(',');
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
            <ProForm onFinish={wrapSet} request={wrapGet} submitter={{
                resetButtonProps: {
                    style: {display: 'none'}
                }
            }}>
                <Divider orientation="left">System</Divider>

                <Disabled disabled={license.isFree()}>
                    <div className={'flex items-center gap-4'}>
                        <Form.Item name="system-logo"
                                   label={t('settings.system.logo')}
                                   rules={[{required: true}]}
                        >
                            <div>
                                <input id={'file'} type={'file'} accept={'.png,.jpg,.jpeg'} style={{display: "none"}}
                                       onChange={fileInputChange}/>
                                <div onClick={() => {
                                    const fileDom = document.getElementById('file');
                                    fileDom.click();
                                }}
                                     className={'w-8 cursor-pointer'}
                                >
                                    {logo ? <img className={'h-8 w-8 rounded'} src={logo} alt="logo"/> : ''}
                                </div>
                            </div>
                        </Form.Item>
                        <ProFormText name="system-name"
                                     label={t('settings.system.name')}
                                     rules={[{required: true}]}
                                     width={'lg'}
                        />
                        <ProFormText name="system-icp"
                                     label={t('settings.system.icp')}
                                     width={'lg'}
                        />
                    </div>

                    <ProFormText name="system-copyright"
                                 label={t('settings.system.copyright')}
                                 rules={[{required: true}]}
                    />
                </Disabled>

                <Divider orientation="left">{t('settings.system.watermark.setting')}</Divider>
                <Disabled disabled={license.isFree()}>
                    <Row gutter={8}>
                        <Col span={4}>
                            <ProFormSwitch name="watermark-enabled"
                                           label={t("settings.system.watermark.status")}
                                           rules={[{required: true}]}
                                           checkedChildren={t('general.enabled')}
                                           unCheckedChildren={t('general.disabled')}
                                           fieldProps={{
                                               checked: enabled,
                                               onChange: setEnabled,
                                           }}
                            />
                        </Col>
                        <Col span={12}>
                            <ProFormText name="watermark-content"
                                         label={t('settings.system.watermark.content')}
                                         rules={[{required: true}]}
                                         disabled={!enabled}
                            />
                        </Col>
                        <Col span={4}>
                            <ProFormCheckbox
                                name="watermark-content-user-account"
                                label={t('settings.system.watermark.append.user')}
                                disabled={!enabled}
                            />
                        </Col>
                        <Col span={4}>
                            <ProFormCheckbox
                                name="watermark-content-asset-username"
                                label={t('settings.system.watermark.append.asset')}
                                disabled={!enabled}
                            />
                        </Col>
                    </Row>

                    <Row gutter={8}>
                        <Col span={4}>
                            <Form.Item name="watermark-font-color"
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
                        </Col>
                        <Col span={12}>
                            <ProFormSlider name="watermark-font-size"
                                           label={t('settings.system.watermark.font.size')}
                                           rules={[{required: true}]}
                                           min={1}
                                           max={100}
                                           disabled={!enabled}
                            />
                        </Col>
                    </Row>
                </Disabled>

                <Divider orientation="left">Access</Divider>
                <ProFormDigit name="access-max-idle-second"
                              label={t('settings.system.access.max_idle_second')}
                              tooltip={t('general.less-zero-tip')}
                              min={-1}
                              addonAfter={t('settings.system.access.second')}
                              fieldProps={{
                                  precision: 0 // 只允许整数
                              }}
                />

                <ProFormSelect
                    name="ip-extractor"
                    label={t('settings.system.ip.extractor')}
                    rules={[{required: true}]}
                    options={[
                        {label: t('settings.system.ip.extractor_direct'), value: 'direct'},
                        {label: 'Header(X-Real-IP)', value: 'x-real-ip'},
                        {label: 'Header(X-Forwarded-For)', value: 'x-forwarded-for'},
                    ]}
                    width={'sm'}
                />

                <ProFormDependency name={['ip-extractor']}>
                    {(record) => {
                        if (record['ip-extractor'] === 'direct') {
                            return <></>;
                        }
                        return <div>
                            <ProFormSelect name="ip-trust-list"
                                           label={t('settings.system.ip.trust_list')}
                                           placeholder={t('settings.system.ip.trust_placeholder')}
                                           fieldProps={{
                                               mode: 'tags',
                                               value: ipTrustList,
                                               onChange: setIpTrustList,
                                           }}
                            />
                        </div>
                    }}
                </ProFormDependency>
            </ProForm>
        </div>
    );
};

export default SystemSetting;