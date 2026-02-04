import React, {RefObject} from 'react';
import {Breadcrumb, Button, Dropdown, MenuProps, Select, Switch} from 'antd';
import {DownOutlined, MenuOutlined, MoonOutlined, SunOutlined} from '@ant-design/icons';
import {LanguagesIcon, LaptopIcon} from 'lucide-react';
import clsx from 'clsx';
import i18n from 'i18next';
import {useTranslation} from "react-i18next";

interface LayoutHeaderProps {
    isMobile: boolean;
    breakItems: any[];
    onMobileMenuOpen: () => void;
    isDarkMode: boolean;
    onThemeToggle: (isDark: boolean) => void;
    themeToggleRef: RefObject<HTMLButtonElement>;
    userInfo?: any;
    dropMenus: MenuProps['items'];
}

/**
 * 布局头部组件
 * 整合面包屑、语言选择、主题切换、用户菜单等
 */
const LayoutHeader: React.FC<LayoutHeaderProps> = ({
    isMobile,
    breakItems,
    onMobileMenuOpen,
    isDarkMode,
    onThemeToggle,
    themeToggleRef,
    userInfo,
    dropMenus,
}) => {
    const {t} = useTranslation();
    return (
        <div className={clsx('flex items-center h-[60px] justify-between', {
            'px-4': isMobile,
            'px-8': !isMobile
        })}>
            {/* 移动端菜单按钮 */}
            {isMobile && (
                <Button
                    type="text"
                    icon={<MenuOutlined/>}
                    onClick={onMobileMenuOpen}
                    className="mr-2"
                />
            )}

            {/* 面包屑导航 - 移动端隐藏 */}
            {!isMobile && <Breadcrumb items={breakItems} />}

            <div className={clsx('flex items-center', {
                'gap-2': isMobile,
                'gap-4': !isMobile
            })}>
                {/* 语言选择 - 移动端隐藏 */}
                {!isMobile && (
                    <Select
                        placeholder={t('general.language')}
                        variant="borderless"
                        style={{width: 120}}
                        prefix={<LanguagesIcon className={'w-4 h-4'}/>}
                        options={[
                            {value: 'en-US', label: t('general.language_en_us')},
                            {value: 'zh-CN', label: t('general.language_zh_cn')},
                            {value: 'zh-TW', label: t('general.language_zh_tw')},
                            {value: 'ja-JP', label: t('general.language_ja_jp')},
                        ]}
                        value={i18n.language}
                        onChange={(value) => {
                            i18n.changeLanguage(value);
                        }}
                    />
                )}

                {/* 访问页面按钮 */}
                <a
                    className={'cursor-pointer'}
                    href="/access"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <LaptopIcon className={clsx({
                        'w-4 h-4': isMobile,
                        'w-5 h-5': !isMobile
                    })}/>
                </a>

                {/* 主题切换 */}
                <Switch
                    ref={themeToggleRef}
                    checkedChildren={<MoonOutlined/>}
                    unCheckedChildren={<SunOutlined/>}
                    checked={isDarkMode}
                    onChange={onThemeToggle}
                    size={isMobile ? 'small' : undefined}
                />

                {/* 用户下拉菜单 */}
                <Dropdown
                    menu={{
                        items: dropMenus
                    }}
                >
                    <Button
                        type="text"
                        icon={<DownOutlined/>}
                        size={isMobile ? 'small' : undefined}
                    >
                        {isMobile ? '' : userInfo?.nickname || ''}
                    </Button>
                </Dropdown>
            </div>
        </div>
    );
};

export default LayoutHeader;
