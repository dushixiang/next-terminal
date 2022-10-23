import React, {useImperativeHandle, useState} from 'react';
import './DragWeekTime.css'
import {renderWeekDay} from "../../utils/week";
import {hasText} from "../../utils/utils";

const theadArr = Array.from(Array(24)).map((ret, id) => id);
const formatDate = (date, fmt) => {
    const o = {
        'M+': date.getMonth() + 1,
        'd+': date.getDate(),
        'h+': date.getHours(),
        'm+': date.getMinutes(),
        's+': date.getSeconds(),
        'q+': Math.floor((date.getMonth() + 3) / 3),
        S: date.getMilliseconds()
    }
    if (/(y+)/.test(fmt)) {
        fmt = fmt.replace(
            RegExp.$1,
            (date.getFullYear() + '').substr(4 - RegExp.$1.length)
        )
    }
    for (const k in o) {
        if (new RegExp('(' + k + ')').test(fmt)) {
            fmt = fmt.replace(
                RegExp.$1,
                RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length)
            )
        }
    }
    return fmt
}

const createArr = (len) => {
    return Array.from(Array(len)).map((ret, id) => id)
}

const formatWeekTime = (col) => {
    const timestamp = 1542384000000 // '2018-11-17 00:00:00'
    const beginstamp = timestamp + col * 1800000 // col * 30 * 60 * 1000
    const endstamp = beginstamp + 1800000

    const begin = formatDate(new Date(beginstamp), 'hh:mm')
    const end = formatDate(new Date(endstamp), 'hh:mm')
    return `${begin}~${end}`
}

const data = [
    '星期一',
    '星期二',
    '星期三',
    '星期四',
    '星期五',
    '星期六',
    '星期日'
].map((ret, index) => {
    const children = (ret, row, max) => {
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
            }
        })
    }
    return {
        value: ret,
        row: index,
        child: children(ret, index, 48)
    }
})

const splicing = (arr) => {
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

const DragWeekTime = ({onRef, onChange}) => {

    useImperativeHandle(onRef, () => {
        // 需要将暴露的接口返回出去
        return {
            renderWeekTime: renderWeekTime,
            reset: handleClearWeekTime,
        };
    });

    let [weekTimeData, setWeekTimeData] = useState(data);
    let [selected, setSelected] = useState(false);
    let [mouseDown, setMouseDown] = useState(false);
    let [startRow, setStartRow] = useState(0);
    let [startCol, setStartCol] = useState(0);
    let [checked, setChecked] = useState(0);
    let [scheduleStyle, setScheduleStyle] = useState({width: 0, height: 0, left: 0, top: 0});
    let [timePeriod, setTimePeriod] = useState([]);

    const handleMouseEnter = (e, item) => {
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

    const handleMouseDown = (e, item) => {
        setChecked(item.checked);
        setMouseDown(true);
        setStartRow(item.row);
        setStartCol(item.col);
    }

    const handleMouseUp = (e, item) => {
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

    const selectWeek = (rows, cols, checked) => {
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
        let timePeriod = weekTimeData.map(item => {
            let key = item.row === 6 ? 0 : item.row + 1;
            return {
                key: key,
                value: splicing(item.child)
            }
        })
        handleChangeTimePeriod(timePeriod);
    }

    const handleChangeTimePeriod = (timePeriod) => {
        if (onChange) {
            onChange(timePeriod);
        }
        if (timePeriod.length > 0) {
            setSelected(true);
        } else {
            setSelected(false);
        }
        setTimePeriod(timePeriod);
    }

    const renderWeekTime = (timePeriod) => {
        handleClearWeekTime();
        for (let i in timePeriod) {
            let v = timePeriod[i].value;
            if (!hasText(v)) {
                continue;
            }
            let cv = v.split('、');
            for (const cvKey in cv) {
                renderTimePeriod(timePeriod[i].key, cv[cvKey]);
            }
        }
        dealTimePeriod();
    }

    const renderTimePeriod = (key, val) => {
        let row = key === 0 ? 6 : key - 1;
        const [start, end] = val.split('~');
        const startVal = countIndex(start);
        const endVal = countIndex(end);
        for (let i = startVal; i < (endVal === 0 ? 48 : endVal); i++) {
            const curWeek = weekTimeData[row]
            curWeek.child[i].checked = true;
        }
        setWeekTimeData(weekTimeData);
    }

    const countIndex = (val) => {
        const one = val.substr(0, 2)
        const a1 = one.startsWith('0') ? one.substr(1, 2) : one
        const reg = RegExp(/30/);
        const a2 = val.match(reg) ? 1 : 0
        return (a1 * 2) + a2
    }

    return (
        <div className='week-time'>
            <div className={`schedule ${mouseDown ? 'schedule-notransi' : ''}`} style={scheduleStyle}/>
            <table className='week-time-table'>
                <thead className='week-time-head'>
                <tr>
                    <th rowSpan={8} className='week-td'>星期/时间</th>
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
                        <td key={'td' + day.value}>{day.value}</td>
                        {day.child.map(item => {
                            return <td className={`week-time-item ${item.checked ? 'ui-selected' : ''}`}
                                       key={`${item.row}-${item.col}`}
                                       onMouseEnter={(e) => handleMouseEnter(e, item)}
                                       onMouseDown={(e) => handleMouseDown(e, item)}
                                       onMouseUp={(e) => handleMouseUp(e, item)}
                            />
                        })}
                    </tr>
                })}
                <tr>
                    <td colSpan="49" className='week-time-preview'>
                        <div className='d-clearfix week-time-con'>
                            <span className="g-pull-left">{selected ? '已选择时间段' : '可拖动鼠标选择时间段'}</span>
                            <a className="g-pull-right" onClick={handleClearWeekTime}>清空选择</a>
                            <a className="g-pull-right" onClick={handleSelectAllWeekTime}>全选</a>
                        </div>
                        {
                            selected ?
                                <div className='week-time-time'>
                                    {timePeriod.map(item => {
                                        if (!hasText(item.value)) {
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