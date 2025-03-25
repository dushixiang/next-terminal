import React, {useEffect, useState} from 'react';
import './DragWeekTime.css'
import strings from "../../utils/strings";
import {useTranslation} from "react-i18next";

export type WeekMapping = {
    [key: string]: string;
};

export interface TimePeriod {
    key: number
    value: string
}

const theadArr = Array.from(Array(24)).map((ret, id) => id);
const formatDate = (date: Date, format: string): string => {
    const options: Record<string, Intl.DateTimeFormatOptions> = {
        'hh:mm': {hour: '2-digit', minute: '2-digit'},
        // 可根据需要添加其他格式
    };

    return new Intl.DateTimeFormat('default', options[format]).format(date);
};

const createArr = (len: number) => {
    return Array.from(Array(len)).map((ret, id) => id)
}

const formatWeekTime = (col: number) => {
    const timestamp = 1542384000000 // '2018-11-17 00:00:00'
    const beginstamp = timestamp + col * 1800000 // col * 30 * 60 * 1000
    const endstamp = beginstamp + 1800000

    let begin = formatDate(new Date(beginstamp), 'hh:mm')
    let end = formatDate(new Date(endstamp), 'hh:mm')
    if(end === '00:00'){
        end = '24:00'
    }
    return `${begin}~${end}`
}

export interface Item {
    week: string
    value: string
    begin: string
    end: string
    row: number
    col: number
    checked: boolean
}

const splicing = (arr: Item[]) => {
    const result = [];
    let same = false;
    for (const i in arr) {
        let item = arr[i];
        if (item.checked) {
            if (item.checked !== same) {
                result.push(...['、', item.begin, '~', item.end])
            } else if (result.length) {
                result.pop();
                result.push(item.end);
            }
        }
        same = item.checked;
    }
    result.shift()
    return result.join('')
}

export interface DragWeekTimeProps {
    onChange?: (timePeriods: TimePeriod[]) => void
    value?: TimePeriod[]
}

const DragWeekTime = ({onChange, value}: DragWeekTimeProps) => {

    let {t} = useTranslation();

    useEffect(() => {
        if (value) {
            renderWeekTime(value)
        }else {
            handleClearWeekTime();
        }
    }, []);

    const weekMapping: WeekMapping = {
        0: t('dw.week.days.sunday'),
        1: t('dw.week.days.monday'),
        2: t('dw.week.days.tuesday'),
        3: t('dw.week.days.wednesday'),
        4: t('dw.week.days.thursday'),
        5: t('dw.week.days.friday'),
        6: t('dw.week.days.saturday'),
    };

    const renderWeekDay = (key: number) => {
        return weekMapping[key];
    };

    const renderWeek = () => {
        return weekMapping;
    }

    const data = Object.keys(renderWeek()).map((day) => {
        let val = renderWeek()[day];
        const children = (ret: string, row: number, max: number) => {
            return createArr(max).map((t, col) => {
                let wt = formatWeekTime(col);
                return {
                    week: ret,
                    value: wt,
                    begin: wt.split('~')[0],
                    end: wt.split('~')[1],
                    row,
                    col,
                    checked: false
                } as Item;
            })
        }
        return {
            value: val,
            day: day,
            child: children(val, parseInt(day), 48)
        }
    })

    let [weekTimeData, setWeekTimeData] = useState(data);
    let [selected, setSelected] = useState(false);
    let [mouseDown, setMouseDown] = useState(false);
    let [startRow, setStartRow] = useState(0);
    let [startCol, setStartCol] = useState(0);
    let [checked, setChecked] = useState<boolean>(false);
    let [scheduleStyle, setScheduleStyle] = useState({width: 0, height: 0, left: 0, top: 0});
    let [timePeriod, setTimePeriod] = useState<TimePeriod[] | undefined>(value);

    const handleMouseEnter = (e: any, item: Item) => {
        let {width, height, left, top} = scheduleStyle;
        if (!mouseDown) {
            left = e.target.offsetLeft;
            top = e.target.offsetTop;
        } else {
            if (item.col <= startCol && item.row <= startRow) {
                width = (startCol - item.col + 1) * e.target.offsetWidth;
                height = (startRow - item.row + 1) * e.target.offsetHeight;
                left = e.target.offsetLeft;
                top = e.target.offsetTop;
            } else if (item.col >= startCol && item.row >= startRow) {
                width = (item.col - startCol + 1) * e.target.offsetWidth;
                height = (item.row - startRow + 1) * e.target.offsetHeight;
                if (item.col > startCol && item.row === startRow) {
                    top = e.target.offsetTop;
                }
                if (item.col === startCol && item.row > startRow) {
                    left = e.target.offsetLeft;
                }
            } else if (item.col > startCol && item.row < startRow) {
                width = (item.col - startCol + 1) * e.target.offsetWidth;
                height = (startRow - item.row + 1) * e.target.offsetHeight;
                top = e.target.offsetTop;
            } else if (item.col < startCol && item.row > startRow) {
                width = (startCol - item.col + 1) * e.target.offsetWidth;
                height = (item.row - startRow + 1) * e.target.offsetHeight;
                left = e.target.offsetLeft;
            }
        }

        setScheduleStyle({
            width: width,
            height: height,
            left: left,
            top: top
        })
    }

    const handleMouseDown = (e: any, item: Item) => {
        setChecked(item.checked);
        setMouseDown(true);
        setStartRow(item.row);
        setStartCol(item.col);
    }

    const handleMouseUp = (e: any, item: Item) => {
        if (item.col <= startCol && item.row <= startRow) {
            selectWeek([item.row, startRow], [item.col, startCol], !checked)
        } else if (item.col >= startCol && item.row >= startRow) {
            selectWeek([startRow, item.row], [startCol, item.col], !checked)
        } else if (item.col > startCol && item.row < startRow) {
            selectWeek([item.row, startRow], [startCol, item.col], !checked)
        } else if (item.col < startCol && item.row > startRow) {
            selectWeek([startRow, item.row], [item.col, startCol], !checked)
        }
        setScheduleStyle({
            width: 0,
            height: 0,
            left: 0,
            top: 0
        })
        setMouseDown(false);
        dealTimePeriod();
    }

    const selectWeek = (rows: number[], cols: number[], checked: boolean) => {
        const [startRow, endRow] = rows;
        const [startCol, endCol] = cols;
        weekTimeData.forEach(day => {
            day.child.forEach(item => {
                if (item.row >= startRow && item.row <= endRow && item.col >= startCol && item.col <= endCol) {
                    item.checked = checked;
                }
            })
        })
        setWeekTimeData(weekTimeData);
    }

    const handleClearWeekTime = () => {
        weekTimeData.forEach(day => {
            day.child.forEach(item => {
                item.checked = false;
            })
        })
        setWeekTimeData(weekTimeData);
        handleChangeTimePeriod([])
    }

    const handleSelectAllWeekTime = () => {
        weekTimeData.forEach(day => {
            day.child.forEach(item => {
                item.checked = true;
            })
        })
        setWeekTimeData(weekTimeData);
        dealTimePeriod();
    }

    // 解析时间区间
    const dealTimePeriod = () => {
        let timePeriods = weekTimeData.map(item => {
            let key = parseInt(item.day);
            return {
                key: key,
                value: splicing(item.child)
            } as TimePeriod;
        })
        handleChangeTimePeriod(timePeriods);
    }

    const handleChangeTimePeriod = (timePeriods: TimePeriod[]) => {
        if (onChange) {
            onChange(timePeriods);
        }
        if (timePeriods.length > 0) {
            setSelected(true);
        } else {
            setSelected(false);
        }
        setTimePeriod(timePeriods);
    }

    const renderWeekTime = (timePeriods?: TimePeriod[]) => {
        handleClearWeekTime();
        for (let i in timePeriods) {
            let v = timePeriods[i].value;
            if (!strings.hasText(v)) {
                continue;
            }
            let cv = v.split('、');
            for (const cvKey in cv) {
                renderTimePeriod(timePeriods[i].key, cv[cvKey]);
            }
        }
        dealTimePeriod();
    }

    const renderTimePeriod = (key: number, val: string) => {
        let row = key;
        const [start, end] = val.split('~');
        const startVal = countIndex(start);
        const endVal = countIndex(end);
        for (let i = startVal; i < (endVal === 0 ? 48 : endVal); i++) {
            const curWeek = weekTimeData[row]
            curWeek.child[i].checked = true;
        }
        setWeekTimeData(weekTimeData);
    }

    const countIndex = (val: string): number => {
        const a1 = Number(val.slice(0, 2).replace(/^0/, '')) || 0;
        const a2 = /30/.test(val) ? 1 : 0;
        return a1 * 2 + a2;
    };

    return (
        <div className='week-time'>
            <div className={`schedule ${mouseDown ? 'schedule-notransi' : ''}`} style={scheduleStyle}/>
            <table className='week-time-table'>
                <thead className='week-time-head'>
                <tr>
                    <th rowSpan={8} className='week-td'>{t('dw.week.label')}/{t('dw.time')}</th>
                    <th colSpan={24}>00:00 - 12:00</th>
                    <th colSpan={24}>12:00 - 24:00</th>
                </tr>
                <tr>
                    {theadArr.map(item => <td colSpan={2} key={item}>{item}</td>)}
                </tr>
                </thead>
                <tbody className='week-time-body'>
                {weekTimeData.map(day => {
                    return <tr key={'tr' + day.value}>
                        <td key={'td' + day.value} data-value={day.value}>{day.value}</td>
                        {
                            day.child.map(item => {
                                return <td className={`${item.checked ? 'ui-selected' : ''}`}
                                           key={`${item.row}-${item.col}`}
                                           onMouseEnter={(e) => handleMouseEnter(e, item)}
                                           onMouseDown={(e) => handleMouseDown(e, item)}
                                           onMouseUp={(e) => handleMouseUp(e, item)}
                                           data-value={item.value}
                                />
                            })
                        }
                    </tr>
                })}
                <tr>
                    <td colSpan={49} className='week-time-preview'>
                        <div className='d-clearfix week-time-con'>
                            <span className="g-pull-left">{selected ? t('dw.selected') : t('dw.select')}</span>
                            <a className="g-pull-right" onClick={handleClearWeekTime}>{t('dw.clear')}</a>
                            <a className="g-pull-right" onClick={handleSelectAllWeekTime}>{t('dw.select_all')}</a>
                        </div>
                        {
                            selected ?
                                <div className='week-time-time'>
                                    {timePeriod?.map(item => {
                                        if (!strings.hasText(item.value)) {
                                            return undefined;
                                        }
                                        return <div key={item.key}>
                                            <p>
                                                <span className='g-tip-text'>{renderWeekDay(item.key)}</span>
                                                <span>{item.value}</span>
                                            </p>
                                        </div>
                                    })}
                                </div> :
                                undefined
                        }
                    </td>
                </tr>
                </tbody>
            </table>
        </div>
    );
};

export default DragWeekTime;