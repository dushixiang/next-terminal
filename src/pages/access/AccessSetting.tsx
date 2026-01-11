import React, {useEffect, useRef, useState} from 'react';
import {ProForm, ProFormCheckbox, ProFormDigit, ProFormInstance, ProFormSelect} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {CleanTheme, DefaultTerminalTheme, useTerminalTheme} from "@/hook/use-terminal-theme";
import {getAvailableFonts} from "@/utils/utils";
import {App} from "antd";
import accessSettingApi from "@/api/access-setting-api";
import {ScrollArea} from "@/components/ui/scroll-area";
import {useWindowSize} from "react-use";


const AccessSetting = () => {
    let {t} = useTranslation();
    const formRef = useRef<ProFormInstance>(null);
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
        let fontFamily = cleanTheme.fontFamily
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

        return setting
    }

    return (
        <ScrollArea style={{
            height: height - 80,
        }}>
            <div className={'m-8'}>
                <div className={'text-lg font-bold'}>{t('access.settings.system')}</div>

                <div className={'mt-4'}>
                    <ProForm formRef={formRef} request={get} onFinish={async (values) => {
                        if (values['fontFamily'] == 'default') {
                            values['fontFamily'] = DefaultTerminalTheme.fontFamily;
                        }
                        setTerminalTheme({
                            ...terminalTheme,
                            ...values
                        })

                        let record: Record<string, string> = {};
                        Object.keys(values).forEach(key => {
                            record[key] = String(values[key]);
                        })
                        await accessSettingApi.set(record);
                        message.success(t('general.success'));
                    }}>
                        <div>{t('access.settings.font')}</div>

                        <div className={'my-4 flex p-4 border gap-2 rounded'}>
                            <ProFormSelect label={t('access.settings.terminal.font.family')}
                                           showSearch={true}
                                           name="fontFamily" rules={[{required: true}]}
                                           fieldProps={{
                                               onChange: (value) => {
                                                   setPreviewFont(value === 'default' ? DefaultTerminalTheme.fontFamily : value as string);
                                               }
                                           }}
                                           request={async () => {
                                               return [
                                                   {
                                                       label: 'Default',
                                                       value: 'default'
                                                   },
                                                   ...availableFonts.map(font => {
                                                       return {
                                                           label: font,
                                                           value: font
                                                       }
                                                   })
                                               ]
                                           }}
                                           width={'sm'}
                            />
                            <ProFormSelect label={t('access.settings.terminal.font.size')}
                                           name="fontSize"
                                           rules={[{required: true}]}
                                           fieldProps={{
                                               onChange: (value) => {
                                                   setPreviewFontSize(value as number);
                                               }
                                           }}
                                           request={async () => {
                                               return [
                                                   {
                                                       label: '10',
                                                       value: 10
                                                   },
                                                   {
                                                       label: '12',
                                                       value: 12
                                                   },
                                                   {
                                                       label: '14',
                                                       value: 14
                                                   },
                                                   {
                                                       label: '16',
                                                       value: 16
                                                   },
                                                   {
                                                       label: '18',
                                                       value: 18
                                                   },
                                                   {
                                                       label: '20',
                                                       value: 20
                                                   },
                                                   {
                                                       label: '22',
                                                       value: 22
                                                   },
                                                   {
                                                       label: '24',
                                                       value: 24
                                                   },
                                                   {
                                                       label: '26',
                                                       value: 26
                                                   },
                                                   {
                                                       label: '28',
                                                       value: 28
                                                   },
                                                   {
                                                       label: '30',
                                                       value: 30
                                                   },
                                               ]
                                           }}
                            />
                            <ProFormDigit
                                label={t('access.settings.terminal.line_height')}
                                name={'lineHeight'}
                                min={1.0}
                                max={2.0}
                                rules={[{required: true}]}
                                fieldProps={{
                                    onChange: (value) => {
                                        if (value) {
                                            setPreviewLineHeight(value);
                                        }
                                    }
                                }}
                            />

                        </div>

                        {/* 字体预览区域 */}
                        <div className={'my-4'}>
                            <div className={'mb-2 font-semibold'}>{t('access.settings.font.preview')}</div>
                            <div
                                className={'p-4 border rounded bg-gray-50 dark:bg-[#141414] overflow-auto'}
                                style={{
                                    fontFamily: previewFont,
                                    fontSize: `${previewFontSize}px`,
                                    lineHeight: previewLineHeight,
                                }}
                            >
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
                            <ProFormCheckbox
                                label={t('access.settings.mouse.selection_copy')}
                                name={'selectionCopy'}
                            />
                            <ProFormCheckbox
                                label={t('access.settings.mouse.right_click_paste')}
                                name={'rightClickPaste'}
                            />
                        </div>

                        <div>{t('access.settings.keyboard.label')}</div>
                        <div className={'my-4 flex p-4 border gap-2 rounded'}>
                            <ProFormCheckbox
                                label={t('access.settings.keyboard.intercept_search_shortcut')}
                                name={'interceptSearchShortcut'}
                            />
                        </div>
                    </ProForm>
                </div>
            </div>
        </ScrollArea>
    );
};

export default AccessSetting;