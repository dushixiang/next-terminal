import {useMemo} from 'react';
import {Progress} from "antd";

const getStrokeColors = (user: number, system: number, steps: number) => {
    const greenSteps = Math.floor((user / 100) * steps);
    const redSteps = Math.floor((system / 100) * steps);
    const remainder  = Math.max(steps - greenSteps - redSteps, 0);

    return Array(greenSteps).fill('#52c41a').concat(
        Array(redSteps).fill('#ff4d4f'),
        Array(remainder).fill('#d9d9d9')
    );
};

export const CpuProgressBar = ({cpu, index}) => {
    const steps = 50;
    const strokeColors = useMemo(() => getStrokeColors(cpu.user, cpu.system, steps), [cpu, steps]);

    return (
        <div className="flex items-center gap-2" key={index}>
            <Progress
                percent={cpu.user + cpu.nice + cpu.system}
                steps={steps}
                strokeColor={strokeColors}
                size="small"
                format={(percent) => <span className="text-xs">{percent.toFixed(1)}%</span>}
                className="w-full"
            />
        </div>
    );
};
