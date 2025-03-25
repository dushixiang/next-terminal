import React, {useEffect, useState} from 'react';
import "@xterm/xterm/css/xterm.css";
import XtermThemes from "@/src/color-theme/XtermThemes";
import {CheckCard} from '@ant-design/pro-components';
import SimpleBar from "simplebar-react";
import {useWindowSize} from "react-use";
import {useTerminalTheme} from "@/src/hook/use-terminal-theme";
import {useTranslation} from 'react-i18next';
import {useLicense} from "@/src/hook/use-license";
import Disabled from "@/src/components/Disabled";

const themes = XtermThemes;

const text = `
\u001b[1;32mnext\u001b[0m@\u001b[1;32mterminal\u001b[0m$ ls
\u001b[1;34mdrwxr-xr-x\u001b[0m 1 root  \u001b[1;34mboot\u001b[0m
\u001b[1;34mdrwxr-xr-x\u001b[0m 1 root  \u001b[1;34mdata\u001b[0m
\u001b[1;34mdrwxr-xr-x\u001b[0m 1 root  \u001b[1;34mdev\u001b[0m
\u001b[1;34mdrwxr-xr-x\u001b[0m 1 root  \u001b[1;34metc\u001b[0m
`;

const ThemeRendererV2 = ({theme, text}) => {
    const [renderedText, setRenderedText] = useState('');

    const ansiColorMap = {
        '1;32': 'brightGreen',
        '1;34': 'brightBlue'
    };

    const renderAnsiText = (text: string) => {
        const lines = text.split('\n');
        let output = '';

        lines.forEach(line => {
            let renderedLine = '';

            const ansiRegex = /\u001b\[(\d+);(\d+)m(.*?)\u001b\[0m/g;
            let match;
            let lastIndex = 0;

            while ((match = ansiRegex.exec(line)) !== null) {
                renderedLine += line.substring(lastIndex, match.index);

                const color = ansiColorMap[`${match[1]};${match[2]}`];
                if (color) {
                    renderedLine += `<span style="color: ${theme[color]}">${match[3]}</span>`;
                } else {
                    renderedLine += match[3];
                }

                lastIndex = ansiRegex.lastIndex;
            }

            renderedLine += line.substring(lastIndex);
            output += `<div>${renderedLine}</div>`;
        });

        setRenderedText(output);
    };

    useEffect(() => {
        renderAnsiText(text);
    }, []);

    return (
        <div style={{backgroundColor: theme['background'], color: theme['foreground']}}>
            <pre>
                <div dangerouslySetInnerHTML={{__html: renderedText}}/>
            </pre>
        </div>
    );
};

const AccessTheme = () => {

    let [accessTheme, setAccessTheme] = useTerminalTheme();
    let {height} = useWindowSize();
    let {t} = useTranslation();
    let [license] = useLicense();

    return (
        <SimpleBar style={{
            maxHeight: height - 40,
        }}>
            <div className={'flex items-center justify-center'}>
                <div className={'m-8'}>
                    <Disabled disabled={license.isFree()}>
                        <div className={'text-lg font-bold'}>{t('access.settings.theme')}</div>
                    </Disabled>
                    <CheckCard.Group
                        disabled={license.isFree()}
                        onChange={(value) => {
                            let name = value as string;
                            let v = XtermThemes.find(item => item.name == name);
                            setAccessTheme({
                                ...accessTheme,
                                selected: name,
                                theme: v,
                            })
                        }}
                        value={accessTheme.selected}
                    >
                        <div
                            className={'grid xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-2 grid-cols-1 gap-4 mt-8 '}>
                            {themes.map(item => {
                                return <CheckCard
                                    key={item.name}
                                    title={item.name}
                                    value={item.name}
                                    description={<div>
                                        <div className={'p-4 rounded-lg mt-4'} style={{
                                            backgroundColor: item.value['background']
                                        }}>
                                            {/*<ThemeRender theme={item.value}/>*/}
                                            <ThemeRendererV2 theme={item.value} text={text}/>
                                        </div>
                                    </div>}
                                >

                                </CheckCard>
                            })}
                        </div>
                    </CheckCard.Group>

                </div>
            </div>
        </SimpleBar>
    );
};

export default AccessTheme;