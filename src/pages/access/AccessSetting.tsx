import {useFormRequest} from "@/hook/use-antd-form-query";
import QuerySelect from "@/components/QuerySelect";
import React, {useEffect, useRef, useState} from 'react';
import {useTranslation} from "react-i18next";
import {CleanTheme, DefaultTerminalTheme, useTerminalTheme} from "@/pages/access/hooks/use-terminal-theme";
import {getAvailableFonts} from "@/utils/utils";
import {App, Checkbox, Form, FormInstance, InputNumber} from 'antd';
import accessSettingApi from "@/api/access-setting-api";
import {ScrollArea} from "@/components/ui/scroll-area";
import {useWindowSize} from "react-use";

const AccessSetting = () => {
    let {t} = useTranslation();
    const formRef = useRef<FormInstance>(null);
    let {height} = useWindowSize();
    let [terminalTheme, setTerminalTheme] = useTerminalTheme();
    let {message} = App.useApp();
    const [availableFonts, setAvailableFonts] = useState([]);
    const [previewFont, setPreviewFont] = useState<string>('');
    const [previewFontSize, setPreviewFontSize] = useState<number>(14);
    const [previewLineHeight, setPreviewLineHeight] = useState<number>(1.2);
    useEffect(() => {
        const loadFonts = async () => {
            try {
                const fonts = await getAvailableFonts();
                setAvailableFonts(fonts);
            } catch (error) {
                console.error('Failed to load fonts:', error);
                setAvailableFonts([]);
            }
        };
        loadFonts();
    }, []);
    const get = async () => {
        let setting = await accessSettingApi.get();
        let cleanTheme = CleanTheme(terminalTheme);
        let fontFamily = cleanTheme.fontFamily;
        if (!setting.fontFamily) {
            setting.fontFamily = fontFamily;
        }
        if (!setting.fontSize) {
            setting.fontSize = cleanTheme.fontSize;
        }
        if (!setting.lineHeight) {
            setting.lineHeight = cleanTheme.lineHeight;
        }
        if (setting.fontFamily == DefaultTerminalTheme.fontFamily) {
            setting.fontFamily = 'default';
        }

        // 初始化预览状态
        setPreviewFont(setting.fontFamily === 'default' ? DefaultTerminalTheme.fontFamily : setting.fontFamily);
        setPreviewFontSize(setting.fontSize);
        setPreviewLineHeight(setting.lineHeight);
        return setting;
    };
    useFormRequest(formRef, ["form-request", "web/src/pages/access/AccessSetting.tsx"], get, true);
    return <ScrollArea style={{
        height: height - 80
    }}>
        <div className={'m-8'}>
            <div className={'text-lg font-bold'}>{t('menus.setting.label')}</div>

            <div className={'mt-4'}>
                <Form onFinish={async values => {
                    if (values['fontFamily'] == 'default') {
                        values['fontFamily'] = DefaultTerminalTheme.fontFamily;
                    }
                    setTerminalTheme({
                        ...terminalTheme,
                        ...values
                    });
                    let record: Record<string, string> = {};
                    Object.keys(values).forEach(key => {
                        record[key] = String(values[key]);
                    });
                    await accessSettingApi.set(record);
                    message.success(t('general.success'));
                }} ref={formRef} layout="vertical">
                    <div>{t('access.settings.font')}</div>

                    <div className={'my-4 flex p-4 border gap-2 rounded'}>
                        <Form.Item label={t('access.settings.terminal.font_family')} name="fontFamily" rules={[{
                            required: true
                        }]}>
                            <QuerySelect
                                onChange={value => {
                                    setPreviewFont(value === 'default' ? DefaultTerminalTheme.fontFamily : value as string);
                                }}
                                showSearch={true}
                                request={async () => {
                                return [{
                                    label: 'Default',
                                    value: 'default'
                                }, ...availableFonts.map(font => {
                                    return {
                                        label: font,
                                        value: font
                                    };
                                })];
                            }} style={{
                                width: 'sm'
                            }}/>
                        </Form.Item>
                        <Form.Item label={t('access.settings.terminal.font_size')} name="fontSize" rules={[{
                            required: true
                        }]}>
                            <QuerySelect
                                onChange={value => {
                                    setPreviewFontSize(value as number);
                                }}
                                request={async () => {
                                return [{
                                    label: '10',
                                    value: 10
                                }, {
                                    label: '12',
                                    value: 12
                                }, {
                                    label: '14',
                                    value: 14
                                }, {
                                    label: '16',
                                    value: 16
                                }, {
                                    label: '18',
                                    value: 18
                                }, {
                                    label: '20',
                                    value: 20
                                }, {
                                    label: '22',
                                    value: 22
                                }, {
                                    label: '24',
                                    value: 24
                                }, {
                                    label: '26',
                                    value: 26
                                }, {
                                    label: '28',
                                    value: 28
                                }, {
                                    label: '30',
                                    value: 30
                                }];
                            }}/>
                        </Form.Item>
                        <Form.Item label={t('access.settings.terminal.line_height')} name={'lineHeight'} rules={[{
                            required: true
                        }]}>
                            <InputNumber
                                onChange={value => {
                                    if (value) {
                                        setPreviewLineHeight(value);
                                    }
                                }}
                                min={1.0} max={2.0} style={{
                                width: "100%"
                            }}/>
                        </Form.Item>

                    </div>

                    {/* 字体预览区域 */}
                    <div className={'my-4'}>
                        <div className={'mb-2 font-semibold'}>{t('access.settings.font.preview')}</div>
                        <div className={'p-4 border rounded bg-gray-50 dark:bg-[#141414] overflow-auto'} style={{
                            fontFamily: previewFont,
                            fontSize: `${previewFontSize}px`,
                            lineHeight: previewLineHeight
                        }}>
                            <div>ABCDEFGHIJKLMNOPQRSTUVWXYZ</div>
                            <div>abcdefghijklmnopqrstuvwxyz</div>
                            <div>0123456789 !@#$%^&*()</div>
                            <div>{'`~-_=+[]{}\\|;:\'",.<>/?'}</div>
                            <div className={'mt-2'}>$ npm install next-terminal</div>
                            <div>$ ssh user@192.168.1.100</div>
                            <div>$ ps aux | grep node</div>
                        </div>
                    </div>

                    <div>{t('access.settings.mouse.label')}</div>
                    <div className={'my-4 flex p-4 border gap-2 rounded'}>
                        <Form.Item name={'selectionCopy'} valuePropName="checked">
                            <Checkbox>{t('access.settings.mouse.selection_copy')}</Checkbox>
                        </Form.Item>
                        <Form.Item name={'rightClickPaste'} valuePropName="checked">
                            <Checkbox>{t('access.settings.mouse.right_click_paste')}</Checkbox>
                        </Form.Item>
                    </div>

                    <div>{t('access.settings.keyboard.label')}</div>
                    <div className={'my-4 flex p-4 border gap-2 rounded'}>
                        <Form.Item name={'interceptSearchShortcut'} valuePropName="checked">
                            <Checkbox>{t('access.settings.keyboard.intercept_search_shortcut')}</Checkbox>
                        </Form.Item>
                        <Form.Item name={'macOptionIsMeta'} valuePropName="checked">
                            <Checkbox>{t('access.settings.keyboard.mac_option_is_meta')}</Checkbox>
                        </Form.Item>
                    </div>
                </Form>
            </div>
        </div>
    </ScrollArea>;
};
export default AccessSetting;
