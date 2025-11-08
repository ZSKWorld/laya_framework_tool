import * as fs from "fs";
import * as path from "path";

/**创建目录，递归创建 */
export function MakeDir(dirPath: string) {
    fs.mkdirSync(dirPath, { recursive: true });
}

/**删除目录，包括目录中所有文件和子目录 */
export function RemoveDir(dir: string) {
    if (fs.existsSync(dir) == false) return;
    const files = fs.readdirSync(dir)
    for (let i = 0; i < files.length; i++) {
        const newPath = path.join(dir, files[i]);
        const stat = fs.statSync(newPath)
        if (stat.isDirectory()) {
            RemoveDir(newPath);
        } else {
            fs.unlinkSync(newPath);
        }
    }
    fs.rmdirSync(dir)
}

export function GetAllDir(dirPath: string, recursive?: boolean, absolute?: boolean,) {
    if (fs.existsSync(dirPath) == false) return [];
    const dirs: string[] = [];
    fs.readdirSync(dirPath).forEach(filename => {
        const filePath = path.resolve(dirPath, filename);
        const state = fs.statSync(filePath);
        if (state.isDirectory()) {
            dirs.push(filePath);
            if (recursive)
                dirs.push(...GetAllDir(filePath, recursive, absolute));
        }
    });
    return dirs;
}

/**
 * 获取目录中的所有文件
 * @param dirPath 路径
 * @param absolute 是否返回文件绝对路径
 * @param filter 过滤函数
 * @param map 修改函数
 * @returns 
 */
export function GetAllFile(dirPath: string, absolute?: boolean, filter?: (name: string) => boolean, map?: (name: string) => string) {
    if (fs.existsSync(dirPath) == false) return [];
    const names: string[] = [];
    fs.readdirSync(dirPath).forEach(filename => {
        const filePath = path.resolve(dirPath, filename);
        const state = fs.statSync(filePath);
        if (state.isDirectory()) {
            names.push(...GetAllFile(filePath, absolute, filter, map));
        } else if (state.isFile()) {
            if (!filter || filter(filename)) {
                const temp = map ? map(filename) : filename;
                absolute ? names.push(path.resolve(dirPath, temp)) : names.push(temp);
            }
        }
    });
    return names;
}

/**获取模板内容 */
export function GetTemplateContent(templateName: string) {
    return fs.readFileSync(path.resolve(__dirname, "../../template/" + templateName + ".template")).toString();
}

export function UpperFirst(str: string, splits?: string[], joinStr = "_") {
    if (!str) return str;
    if (str.length == 1) return str.toUpperCase();
    else {
        const temp = str[0].toUpperCase() + str.substring(1);
        if (splits && splits.length) {
            const resultArr = [temp];
            splits.forEach(v => {
                let count = resultArr.length;
                while (count--) {
                    resultArr.push(...resultArr.shift().split(v).map(v1 => UpperFirst(v1)));
                }
            });
            return resultArr.join(joinStr);
        } else {
            return temp;
        }
    }
}

export function GetDateStr() {
    const date = new Date();
    const year = date.getFullYear().toString().padStart(4, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hour = date.getHours().toString().padStart(2, "0");
    const minute = date.getMinutes().toString().padStart(2, "0");
    const sec = date.getSeconds().toString().padStart(2, "0");
    return `${ year }/${ month }/${ day } ${ hour }:${ minute }:${ sec }`;
}

export function HasChinese(str: string) {
    const reg = /[\u4e00-\u9fa5|\u3002|\uff1f|\uff01|\uff0c|\u3001|\uff1b|\uff1a|\u201c|\u201d|\u2018|\u2019|\uff08|\uff09|\u300a|\u300b|\u3008|\u3009|\u3010|\u3011|\u300e|\u300f|\u300c|\u300d|\ufe43|\ufe44|\u3014|\u3015|\u2026|\u2014|\uff5e|\ufe4f|\uffe5]/;
    return reg.test(str);
}