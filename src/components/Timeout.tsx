import React, {Ref, useEffect, useImperativeHandle, useState} from 'react';

interface TimeoutProps {
    fn: () => void;
    ms: number;
}

export interface TimeoutHandle {
    reset: () => void;
}

const Timeout = React.forwardRef(({fn, ms}: TimeoutProps, ref: Ref<TimeoutHandle>) => {
    const [inactiveTime, setInactiveTime] = useState(0);

    useImperativeHandle(ref, () => ({
        reset: () => {
            setInactiveTime(0);
        }
    }));

    useEffect(() => {
        if (ms <= 0) return;

        const interval = setInterval(() => {
            setInactiveTime(prev => {
                const newTime = prev + 1000;
                if (newTime >= ms) {
                    fn();
                    clearInterval(interval);
                    // console.log(`timeout`, new Date().getTime(), newTime, ms)
                    return 0; // 重置计时器
                }
                // console.log(`still`, new Date().getTime(), newTime, ms)
                return newTime;
            });
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [ms, fn]);

    return (
        <div>

        </div>
    );
});

export default Timeout;