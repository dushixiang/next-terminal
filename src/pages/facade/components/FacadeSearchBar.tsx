import React from 'react';
import {Search, X} from 'lucide-react';
import {useTranslation} from 'react-i18next';

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
    const {t} = useTranslation();

    const handleClear = () => {
        onChange('');
    };

    return (
        <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white dark:bg-[#141414] px-3 py-2 shadow-sm">
            <div className="flex items-center gap-2">
                <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300">
                    <Search className="h-4 w-4" />
                </div>
                <input
                    type="text"
                    value={value}
                    placeholder={placeholder || t('general.search_placeholder')}
                    className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                    onChange={(e) => onChange(e.target.value)}
                />
                {(resultCount !== undefined && totalCount !== undefined) && (
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {resultCount}/{totalCount}
                    </span>
                )}
                {value && (
                    <button
                        onClick={handleClear}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label={t('facade.clear_search')}
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
});

FacadeSearchBar.displayName = 'FacadeSearchBar';

export default FacadeSearchBar;
