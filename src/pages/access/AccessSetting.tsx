import React, {useEffect, useRef, useState} from 'react';
import {ProForm, ProFormCheckbox, ProFormDigit, ProFormInstance, ProFormSelect} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {CleanTheme, DefaultTerminalTheme, useTerminalTheme} from "@/src/hook/use-terminal-theme";
import {isFontAvailable} from "@/src/utils/utils";
import {App} from "antd";
import accessSettingApi from "@/src/api/access-setting-api";
import {useAccessSetting} from "@/src/hook/use-access-setting";
import {useQuery} from "@tanstack/react-query";

const fontList = [
    // Windows 上常见的终端字体
    'Consolas',
    'Lucida Console',
    'Courier New',
    'Arial Mono',

    // macOS 上常见的终端字体
    'Menlo',
    'Monaco',
    'Courier',
    'Helvetica Neue',

    'JetBrains Mono',
    'Monospace'
];


const AccessSetting = () => {
    let {t} = useTranslation();
    const formRef = useRef<ProFormInstance>();

    let [terminalTheme, setTerminalTheme] = useTerminalTheme();
    let [_, setAccessSetting] = useAccessSetting();
    let {message} = App.useApp();

    const [availableFonts, setAvailableFonts] = useState([]);

    let settingQuery = useQuery({
        queryKey: ['access-setting'],
        queryFn: accessSettingApi.get,
        enabled: false,
    });

    useEffect(() => {
        if (settingQuery.data) {
            setAccessSetting(settingQuery.data);
        }
    }, [settingQuery.data]);

    useEffect(() => {
        const checkFonts = async () => {
            const results = await Promise.all(
                fontList
                    .filter(font => isFontAvailable(font))
            );
            setAvailableFonts(results);
        };

        checkFonts();
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
        return setting
    }

    return (
        <div className={'flex items-center'}>
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

                        settingQuery.refetch();
                    }}>
                        <div>{t('access.settings.font')}</div>

                        <div className={'my-4 flex p-4 border gap-2 rounded'}>
                            <ProFormSelect label={t('access.settings.terminal.font.family')}
                                           showSearch={true}
                                           name="fontFamily" rules={[{required: true}]}
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
                            />

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
                    </ProForm>
                </div>
            </div>
        </div>
    );
};

export default AccessSetting;