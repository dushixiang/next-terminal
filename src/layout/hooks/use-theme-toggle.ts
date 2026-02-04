import {RefObject, useEffect, useState} from 'react';
import {flushSync} from 'react-dom';
import {DarkTheme, DefaultTheme, useNTTheme} from '@/hook/use-theme.ts';
import {setThemeColor} from '@/utils/theme.ts';

/**
 * 主题切换 Hook
 * 封装主题切换逻辑和 View Transition 动画效果
 */
export function useThemeToggle(ref: RefObject<HTMLElement>) {
    const [ntTheme, setNTTheme] = useNTTheme();
    const [isDarkMode, setIsDarkMode] = useState(ntTheme.isDark);

    // 主题切换函数（包含动画效果）
    const toggleDarkMode = async (isDarkMode: boolean) => {
        // 如果不支持 View Transition API 或用户偏好减少动画，直接切换
        if (
            !ref.current ||
            !document.startViewTransition ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            setIsDarkMode(isDarkMode);
            return;
        }

        // 使用 View Transition API 实现动画效果
        await document.startViewTransition(() => {
            flushSync(() => {
                setIsDarkMode(isDarkMode);
            });
        }).ready;

        // 计算动画的起点和半径
        const {top, left, width, height} = ref.current.getBoundingClientRect();
        const x = left + width / 2;
        const y = top + height / 2;
        const right = window.innerWidth - left;
        const bottom = window.innerHeight - top;
        const maxRadius = Math.hypot(
            Math.max(left, right),
            Math.max(top, bottom),
        );

        // 执行圆形扩散动画
        document.documentElement.animate(
            {
                clipPath: [
                    `circle(0px at ${x}px ${y}px)`,
                    `circle(${maxRadius}px at ${x}px ${y}px)`,
                ],
            },
            {
                duration: 500,
                easing: 'ease-in-out',
                pseudoElement: '::view-transition-new(root)',
            }
        );
    };

    // 应用主题变化
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            setThemeColor('#09090B');
            setNTTheme(DarkTheme);
        } else {
            document.documentElement.classList.remove('dark');
            setThemeColor('#fff');
            setNTTheme(DefaultTheme);
        }
    }, [isDarkMode, setNTTheme]);

    return {isDarkMode, toggleDarkMode};
}
