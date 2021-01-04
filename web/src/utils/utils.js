import React from "react";
import {Link} from "react-router-dom";

export const sleep = function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export const getToken = function () {
    return localStorage.getItem('X-Auth-Token');
}

export const getHeaders = function () {
    return {'X-Auth-Token': getToken()};
}

export const itemRender = function (route, params, routes, paths) {
    const last = routes.indexOf(route) === routes.length - 1;
    return last ? (
        <span>{route.breadcrumbName}</span>
    ) : (
        <Link to={paths.join('/')}>{route.breadcrumbName}</Link>
    );
}

export const formatDate = function (time, format) {
    let date = new Date(time);
    let o = {
        "M+": date.getMonth() + 1,
        "d+": date.getDate(),
        "h+": date.getHours(),
        "m+": date.getMinutes(),
        "s+": date.getSeconds(),
        "q+": Math.floor((date.getMonth() + 3) / 3), //quarter
        "S": date.getMilliseconds() //millisecond
    };
    if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
    }
    for (let k in o) {
        if (new RegExp("(" + k + ")").test(format)) {
            format = format.replace(RegExp.$1, RegExp.$1.length === 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
        }
    }
    return format;
};

export const isLeapYear = function (year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 100 === 0 && year % 400 === 0);
};

export const groupBy = (list, fn) => {
    const groups = {};

    list.forEach(x => {
        let groupKey = fn(x).toString();
        groups[groupKey] = groups[groupKey] || [];
        groups[groupKey].push(x);
    });

    return groups;
};

export const cloneObj = (obj, ignoreFields) => {
    let str, newObj = obj.constructor === Array ? [] : {};
    if (typeof obj !== 'object') {
        return;
    } else if (window.JSON) {
        str = JSON.stringify(obj);
        newObj = JSON.parse(str);
    } else {
        for (const i in obj) {
            newObj[i] = typeof obj[i] === 'object' ? cloneObj(obj[i]) : obj[i];
        }
    }
    return newObj;
};

export function download(url) {
    let aElement = document.createElement('a');
    aElement.setAttribute('download', '');
    aElement.setAttribute('target', '_blank');
    aElement.setAttribute('href', url);
    aElement.click();
}

export function differTime(start, end) {
    //总秒数
    let millisecond = Math.floor((end.getTime() - start.getTime()) / 1000);

    //总天数
    let allDay = Math.floor(millisecond / (24 * 60 * 60));

    //注意同getYear的区别
    let startYear = start.getFullYear();
    let currentYear = end.getFullYear();

    //闰年个数
    let leapYear = 0;
    for (let i = startYear; i < currentYear; i++) {
        if (isLeapYear(i)) {
            leapYear++;
        }
    }

    //年数
    const year = Math.floor((allDay - leapYear * 366) / 365 + leapYear);

    //天数
    let day;
    if (allDay > 366) {
        day = (allDay - leapYear * 366) % 365;
    } else {
        day = allDay;
    }
    //取余数(秒)
    const remainder = millisecond % (24 * 60 * 60);
    //小时数
    const hour = Math.floor(remainder / (60 * 60));
    //分钟数
    const minute = Math.floor(remainder % (60 * 60) / 60);
    //秒数
    const second = remainder - hour * 60 * 60 - minute * 60;

    let show = '';
    if (year > 0) {
        show += year + '年';
    }

    if (day > 0) {
        show += day + '天';
    }

    if (hour > 0) {
        show += hour + '小时';
    }

    if (minute > 0) {
        show += minute + '分钟';
    }

    if (second > 0) {
        show += second + '秒';
    }
    return show;
}

export const isEmpty = (text) =>{
    return text === undefined || text == null || text.length === 0;
}
