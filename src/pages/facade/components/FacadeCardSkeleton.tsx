import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface FacadeCardSkeletonProps {
    count?: number; // 显示几个骨架卡片
}

/**
 * Facade 卡片骨架屏组件 - 简洁现代风格
 */
const FacadeCardSkeleton: React.FC<FacadeCardSkeletonProps> = React.memo(({ count = 8 }) => {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className="animate-in fade-in duration-500"
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                    <div className="rounded-xl ring-1 ring-slate-200/60 dark:ring-slate-700/60 bg-white dark:bg-[#141414] shadow-sm dark:shadow-md p-4 space-y-3">
                        {/* Logo 和标题区域 */}
                        <div className="flex gap-3">
                            {/* Logo 骨架 */}
                            <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />

                            {/* 内容骨架 */}
                            <div className="flex-1 min-w-0 space-y-1.5">
                                {/* 标题 */}
                                <Skeleton className="h-4 w-3/4" />
                                {/* 地址 */}
                                <Skeleton className="h-3 w-full" />
                            </div>
                        </div>

                        {/* 描述骨架 */}
                        <div className="space-y-1.5">
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-2/3" />
                        </div>

                        {/* 标签骨架 */}
                        <div className="flex gap-1.5">
                            <Skeleton className="h-5 w-14 rounded-md" />
                            <Skeleton className="h-5 w-16 rounded-md" />
                        </div>

                        {/* 按钮骨架 */}
                        <div className="flex gap-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                            <Skeleton className="h-8 flex-1 rounded-lg" />
                            <Skeleton className="h-8 w-28 rounded-lg" />
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
});

FacadeCardSkeleton.displayName = 'FacadeCardSkeleton';

export default FacadeCardSkeleton;
