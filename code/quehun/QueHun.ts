import * as fs from "fs";
import * as xlsx from "node-xlsx";
import * as path from "path";
// import * as excel from "exceljs";


/** 移除spriteatlas文件，删除所有空文件夹 */
function removeEmptyDirAndSpriteAtlas(dir: string) {
    fs.readdirSync(dir).forEach(v => {
        const vPath = path.resolve(dir, v);
        if (!fs.existsSync(vPath)) return;
        const stat = fs.statSync(vPath);
        if (stat.isDirectory()) {
            removeEmptyDirAndSpriteAtlas(vPath);
            const vDirInfos = fs.readdirSync(vPath);
            if (vDirInfos.length == 0) {
                fs.rmdirSync(vPath);
                fs.unlinkSync(vPath + ".meta");
            }
        } else if (stat.isFile() && v.endsWith(".spriteatlas")) {
            fs.unlinkSync(vPath);
            fs.unlinkSync(vPath + ".meta");
        }
    });
}

/** 是否有中文 */
function hasChinese(str: string) {
    const reg = /[\u4e00-\u9fa5|\u3002|\uff1f|\uff01|\uff0c|\u3001|\uff1b|\uff1a|\u201c|\u201d|\u2018|\u2019|\uff08|\uff09|\u300a|\u300b|\u3008|\u3009|\u3010|\u3011|\u300e|\u300f|\u300c|\u300d|\ufe43|\ufe44|\u3014|\u3015|\u2026|\u2014|\uff5e|\ufe4f|\uffe5]/;
    return reg.test(str);
}

/** 数字转excel表列名 */
function numberToExcelColumn(num: number) {
    let result = '';
    while (num > 0) {
        // Excel列名是基于26进制计算的，但要从1开始计数，所以减去1
        const remainder = (num - 1) % 26;
        result = String.fromCharCode(65 + remainder) + result;
        num = Math.floor((num - 1) / 26);
    }
    return result;
}

const excludes = [
    "函数说明.xlsx",
    "客户端统计id表.xlsx",
    // "ab_match.xlsx",
    // // "audio.xlsx",
    // "compose.xlsx",
    // "contest.xlsx",
    // "events.xlsx",
    // "fan.xlsx",
    // "fandesc.xlsx",
    // "game_live.xlsx",
    // "global.xlsx",
    // "info.xlsx",
    // "leaderboard.xlsx",
    // "mail.xlsx",
    // "match_shilian.xlsx",
    // "misc_function.xlsx",
    // "outfit_config.xlsx",
    // "rank_introduce.xlsx",
    // "season.xlsx",
    // "str.xlsx",
    // "tutorial.xlsx",
    // "voice.xlsx",
];
function findExcelContent(xlsxDir: string, content: string) {
    const startTime = Date.now();
    const map = { content };
    fs.readdirSync(xlsxDir).forEach(excel => {
        if (hasChinese(excel)) return;
        if (excludes.includes(excel)) return;
        if (excel.endsWith(".xlsx") && !excel.startsWith("~$")) {
            let sheets: { name: string, data: string[][] }[] = xlsx.parse(path.resolve(xlsxDir, excel)) as any;
            sheets.forEach(sht => {
                let { name, data } = sht;
                if (hasChinese(name)) return;
                const row = data.length;
                if (!row) return;
                const col = data[0].length;
                if (!col) return;
                const top3 = data.splice(0, 3);
                const [keys, descs, types] = top3;
                const rowCnt = data.length;
                if (!rowCnt) return;
                const colCnt = data[0].length;
                if (!colCnt) return;
                //从第二列开始
                for (let col = 1; col < colCnt; col++) {
                    if (types[col] != "string") continue;
                    for (let row = 0; row < rowCnt; row++) {
                        if (!data[row][col]) continue;
                        if (!data[row][col].includes) continue;
                        if (data[row][col].replace(/\\/g, "/").includes(content)) {
                            map[excel] = map[excel] || {};
                            map[excel][name] = map[excel][name] || [];
                            // map[excel][name].push([row + 3 + 1, numberToExcelColumn(col + 1), data[row][col]]);
                            map[excel][name].push([row + 3 + 1, numberToExcelColumn(col + 1), data[row][col], data[row]]);
                        }
                    }
                }
            });
        }
    });
    const data = JSON.stringify(map, null, 4);
    fs.writeFileSync("code/quehun/output.json", data);
    console.log("搜索完毕", Date.now() - startTime, Object.keys(map));
}


function getAllFile(dirPath: string, absolute?: boolean, filter?: (name: string) => boolean, map?: (name: string) => string) {
    if (fs.existsSync(dirPath) == false) return [];
    const names: string[] = [];
    fs.readdirSync(dirPath).forEach(filename => {
        const filePath = path.resolve(dirPath, filename);
        const state = fs.statSync(filePath);
        if (state.isDirectory()) {
            names.push(...getAllFile(filePath, absolute, filter, map));
        } else if (state.isFile()) {
            if (!filter || filter(filename)) {
                const temp = map ? map(filename) : filename;
                absolute ? names.push(path.resolve(dirPath, temp)) : names.push(temp);
            }
        }
    });
    return names;
}

function findLuaContent(dirPath: string) {
    const includeArr = [
        "LuaTools.Load",
        ":SetTexture(",
        "ImageMgr.Load",
    ];
    const files = getAllFile(dirPath, true, v => v.endsWith(".lua") && !v.endsWith("builder.lua") && !hasChinese(v));
    const result: { [key: string]: any[] } = {};
    files.forEach(v => {
        const content = fs.readFileSync(v).toString();
        if (includeArr.some(iv => content.includes(iv))) {
            result[v] = [];
            const contentArr = content.split("\n");
            contentArr.forEach((cv, i) => {
                if (includeArr.some(iv => cv.includes(iv))) {
                    result[v].push([cv.trim()]);
                }
            });
        }
    });
    fs.writeFileSync("code/quehun/luafind.json", JSON.stringify(result));
}
// removeEmptyDirAndSpriteAtlas("D:\\liqi\\liqi_unity_project_dev\\Assets\\MyAssets\\pic");
findExcelContent("D:\\liqi\\liqi-excel\\data", `뭐"라고`);
// findLuaContent("D:\\liqi\\liqi_unity_project_dev\\Assets\\Lua\\LuaScript");
