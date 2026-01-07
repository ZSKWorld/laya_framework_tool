import * as fs from "fs";
import * as xlsx from "node-xlsx";
import * as path from "path";
import { BuildBase } from "./BuildBase";
import { Declare_CfgMgrPath, Declare_ExcelDir, ExcelDir } from "./Const";
import { GetTemplateContent, HasChinese, UpperFirst } from "./Utils";

const enum ExportType {
    Group = "group",
    Unique = "unique",
    NoKey = "nokey",
    KV = "kv",
}

const typeMap = {
    "float": "number",
    "int32": "number",
    "uint32": "number",
    "string": "string",
};

class SheetData {
    name: string;
    upperName: string;
    tableName: string;
    exportType: ExportType;
    desc: string;
    fieldName: string[];
    fieldType: (number | string | number[] | string[])[];
    fieldDesc: string[];
    keys: string[];

    get sheetDeclareName() { return `ISheet_${ this.tableName }_${ this.upperName }`; }
    get dataDeclareName() { return `ISheetData_${ this.tableName }_${ this.upperName }`; }

    constructor(name: string, key: string, tableName: string, exportType: ExportType, desc: string, datas: string[][]) {
        this.name = name;
        this.upperName = UpperFirst(name, ["_"], "");
        this.tableName = tableName;
        this.exportType = exportType;
        this.desc = desc;
        this.fieldName = [];
        this.fieldType = [];
        this.fieldDesc = [];

        // 1. 结构化特征行提取：单次遍历定位所有核心行
        let headRow: string[] = [], typeRow: string[] = [], commRow: string[] = [];
        for (const row of datas) {
            const head = row[0]?.toString().trim();
            if (head === "##") headRow = row;
            else if (head === "#type") typeRow = row;
            else if (head === "#comment") commRow = row;
            if (headRow.length && typeRow.length && commRow.length) break;
        }

        const names = headRow.slice(1);
        const types = typeRow.slice(1);
        const comments = commRow.slice(1);

        // 2. 字段解析与数组折叠 (如: attr[0], attr[1] -> attr: number[])
        const arrReg = /(.*)(\[[0-9]+\])/;
        for (let i = 0; i < names.length; i++) {
            let tname = names[i];
            if (!tname) continue;

            let ttype = types[i] || "string";
            let tdesc = comments[i] || "";
            const match = arrReg.exec(tname);

            if (match) {
                const baseName = match[1];
                let tindex = 0;
                // 合并后续的数组项
                while (i + 1 < names.length && names[i + 1] === `${ baseName }[${ ++tindex }]`) {
                    i++;
                    ttype = ttype || types[i];
                    tdesc = tdesc || comments[i];
                }
                tname = baseName;
                ttype = (typeMap[ttype] || ttype) + "[]";
            } else {
                ttype = typeMap[ttype] || ttype;
            }

            this.fieldName.push(tname);
            this.fieldType.push(ttype);
            this.fieldDesc.push(tdesc);
        }

        // 3. 主键 Key 列表提取（用于代码提示）
        const keyIndex = headRow.indexOf(key);
        if (keyIndex !== -1) {
            const keyMap: Record<string, boolean> = {};
            // 定位数据开始行：非空且不以#开头
            const startRowIdx = datas.findIndex(v => !v[0] || !v[0].trim().startsWith("#"));
            if (startRowIdx !== -1) {
                datas.slice(startRowIdx).forEach(row => {
                    let kVal = row[keyIndex];
                    if (kVal === undefined || kVal === null || kVal === "") return;
                    if (typeof kVal === "string" && (kVal.includes(" ") || kVal.includes(" "))) {
                        kVal = `"${ kVal }"`;
                    }
                    keyMap[kVal] = true;
                });
            }
            this.keys = Object.keys(keyMap);
        } else {
            this.keys = [];
        }
    }

    getDeclare() {
        const { name, exportType, sheetDeclareName, dataDeclareName, fieldName, fieldType, fieldDesc, keys } = this;

        const dataDeclare = fieldName.map((v, i) => {
            const comment = fieldDesc[i] ? `\t/** ${ fieldDesc[i] } */\n` : "";
            return `${ comment }\t${ v }: ${ fieldType[i] };`;
        }).join("\n");

        const keyDeclare: string[] = [];
        const valType = (exportType === ExportType.Group) ? `${ dataDeclareName }[]` : dataDeclareName;

        if (exportType !== ExportType.NoKey) {
            keyDeclare.push(`\t[key: string]: ${ valType };`);
            keys.forEach(v => keyDeclare.push(`\t${ v }: ${ valType };`));
        }

        return [
            `//#region ${ name }`,
            `declare interface ${ sheetDeclareName } {\n${ keyDeclare.join("\n") }\n}`,
            `declare interface ${ dataDeclareName } {\n${ dataDeclare }\n}`,
            "//#endregion",
        ].join("\n");
    }
}

class ExcelData {
    name: string;
    upperName: string;
    sheets: SheetData[];
    get tableName() { return `ITable_${ this.upperName }`; }

    static createExcel(excelPath: string) {
        const allRawSheets = xlsx.parse(excelPath);
        const sheets = allRawSheets.filter(v => !HasChinese(v.name));
        const exportSheet = sheets.find(v => v.name === "export");
        if (!exportSheet || exportSheet.data.length <= 1) return null;

        const headers = exportSheet.data[0];
        const colMap = {
            sheet: headers.indexOf("sheet"),
            key: headers.indexOf("key"),
            type: headers.indexOf("type"),
            desc: headers.indexOf("desc")
        };

        if (colMap.sheet === -1) return null;

        const excel = new ExcelData();
        excel.name = path.basename(excelPath, ".xlsx");
        excel.upperName = UpperFirst(excel.name, ["_"], "");
        excel.sheets = [];

        exportSheet.data.slice(1).forEach(v => {
            const sName = v[colMap.sheet];
            if (!sName) return;
            const targetRawSheet = sheets.find(s => s.name === sName);
            if (!targetRawSheet) return;

            excel.sheets.push(new SheetData(
                sName, v[colMap.key], excel.upperName,
                v[colMap.type] as ExportType, v[colMap.desc] || "",
                targetRawSheet.data
            ));
        });

        return excel.sheets.length > 0 ? excel : null;
    }

    getDeclare() {
        const sheetsDeclare: string[] = [];
        const keyDeclare: string[] = [];
        this.sheets.forEach(v => {
            sheetsDeclare.push(v.getDeclare());
            const desc = (v.desc ? `${ v.desc }  ---  ` : "") + v.exportType;
            const extStr = (v.exportType === ExportType.Group) ? "CfgExtGroup" : "CfgExt";
            keyDeclare.push(`\t/** ${ desc } */`);
            keyDeclare.push(`\t${ v.name }: ${ extStr }<${ v.sheetDeclareName }>;`);
        });

        return [
            `declare interface ${ this.tableName } {\n${ keyDeclare.join("\n") }\n}`,
            sheetsDeclare.join("\n\n"),
        ].join("\n\n");
    }
}

export class BuildExcelDeclare extends BuildBase {
    doBuild() {
        if (!fs.existsSync(Declare_ExcelDir)) fs.mkdirSync(Declare_ExcelDir, { recursive: true });

        const excelDeclareProps: string[] = [];
        fs.readdirSync(ExcelDir).forEach(v => {
            if (HasChinese(v) || !v.endsWith(".xlsx")) return;
            const filePath = path.resolve(ExcelDir, v);
            if (!fs.statSync(filePath).isFile()) return;

            const excel = ExcelData.createExcel(filePath);
            // 终端带颜色输出日志
            const logStatus = excel ? "\x1b[32m成功\x1b[0m" : "\x1b[31m失败\x1b[0m";
            console.log(`[Build] ${ v } -> ${ logStatus }`);

            if (excel) {
                excelDeclareProps.push(`\treadonly ${ excel.name }: ${ excel.tableName };`);
                fs.writeFileSync(`${ Declare_ExcelDir }/${ excel.name }.d.ts`, excel.getDeclare());
            }
        });

        const cfgMgrContent = [
            `declare interface IConfigManager {`,
            excelDeclareProps.join("\n"),
            `\tinit(): Promise<void>;`,
            `}\n\n`,
            GetTemplateContent("cfgMgr3.0"),
        ].join("\n");

        fs.writeFileSync(Declare_CfgMgrPath, cfgMgrContent);
    }
}