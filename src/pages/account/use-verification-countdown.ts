import {useEffect, useState} from 'react';

export const useVerificationCountdown = (until: number) => {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        setNow(Date.now());
        if (!until) return;
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [until]);
    return Math.max(0, Math.ceil((until - now) / 1000));
};
