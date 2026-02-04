import React from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FacadeSearchBarProps {
    value: string;
    onChange: (value: string) => void;
    resultCount?: number;
    totalCount?: number;
    placeholder?: string;
}

/**
 * Facade 搜索栏组件
 * 带清除按钮和结果计数的搜索框
 */
const FacadeSearchBar: React.FC<FacadeSearchBarProps> = React.memo(({
    value,
    onChange,
    resultCount,
    totalCount,
    placeholder
}) => {
    const { t } = useTranslation();

    const handleClear = () => {
        onChange('');
    };

    return (
        <div className="relative group">
            {/* 渐变边框效果 */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 dark:from-blue-500/30 dark:via-purple-500/30 dark:to-pink-500/30 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-300" />

            <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors duration-200" />
                </div>
                <input
                    type="text"
                    value={value}
                    placeholder={placeholder || t('general.search_placeholder')}
                    className="w-full rounded-xl border-2 border-slate-200/70 dark:border-slate-700/70 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm pl-11 pr-28 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-lg shadow-slate-200/50 dark:shadow-black/30 transition-all duration-200 focus:border-blue-500/70 dark:focus:border-blue-500/70 focus:outline-none focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-blue-500/30 focus:shadow-xl focus:shadow-blue-500/10 dark:focus:shadow-blue-500/20"
                    onChange={(e) => onChange(e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 flex items-center gap-2.5 pr-4">
                    {value && (
                        <>
                            {(resultCount !== undefined && totalCount !== undefined) && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-xs font-medium text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-700/50">
                                    <span className="font-semibold">{resultCount}</span>
                                    <span className="text-slate-500 dark:text-slate-400">/</span>
                                    <span>{totalCount}</span>
                                </span>
                            )}
                            <button
                                onClick={handleClear}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 hover:scale-110 active:scale-95"
                                aria-label={t('facade.clear_search')}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
});

FacadeSearchBar.displayName = 'FacadeSearchBar';

export default FacadeSearchBar;
