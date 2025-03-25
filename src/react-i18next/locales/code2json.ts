// 将对象转换为 JSON 字符串
import zh_cn from "./zh-CN";
import * as fs from "node:fs";

const jsonString = JSON.stringify(zh_cn, null, 2); // null, 2 是为了格式化输出

// 将 JSON 字符串写入到本地文件
fs.writeFile('zh-CN.json', jsonString, 'utf8', (err) => {
    if (err) {
        console.error('An error occurred while writing JSON Object to File.', err);
        return;
    }
    console.log('JSON file has been saved.');
});