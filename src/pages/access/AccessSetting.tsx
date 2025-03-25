import React, {useEffect, useRef, useState} from 'react';
import {ProForm, ProFormDigit, ProFormInstance, ProFormSelect} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {CleanTheme, DefaultTerminalTheme, useTerminalTheme} from "@/src/hook/use-terminal-theme";
import {isFontAvailable} from "@/src/utils/utils";
import {message} from "antd";

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

    const [fontNames, setFontNames] = useState<string[]>([]);

    const [availableFonts, setAvailableFonts] = useState([]);

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

    // useEffect(() => {
    //     let fontNames: String[] = [];
    //     document.fonts.ready.then(() => {
    //         console.log(`ready`, fontNames)
    //         document.fonts.forEach((font) => {
    //             fontNames.push(font.family);
    //             console.log(`push`, font.family)
    //         })
    //
    //         console.log(`fontNames`, fontNames)
    //     })
    //
    //     async function logFontData() {
    //         try {
    //             let fonts = [];
    //             const availableFonts = await window.queryLocalFonts();
    //             for (const fontData of availableFonts) {
    //                 console.log(fontData.postscriptName);
    //                 console.log(fontData.fullName);
    //                 console.log(fontData.family);
    //                 console.log(fontData.style);
    //                 console.log('---------------------');
    //                 fonts.push(fontData.family);
    //             }
    //             setFontNames(fonts);
    //         } catch (err) {
    //             console.error(err.name, err.message);
    //         }
    //     }
    //
    //     logFontData()
    // }, []);

    const get = async () => {
        let cleanTheme = CleanTheme(terminalTheme);
        let fontFamily = cleanTheme.fontFamily
        if (fontFamily == DefaultTerminalTheme.fontFamily) {
            fontFamily = 'default';
        }
        return {
            fontFamily: fontFamily,
            fontSize: cleanTheme.fontSize,
            lineHeight: cleanTheme.lineHeight,
        }
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
                        message.success(t('general.success'))
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
                    </ProForm>
                </div>
            </div>
        </div>
    );
};

export default AccessSetting;