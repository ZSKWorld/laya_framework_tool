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

        const rows: Record<string, any[]> = {};
        for (const row of datas) {
            const head = row[0]?.toString().trim();
            if (head === "##") rows.names = row.slice(1);
            else if (head === "#type") rows.types = row.slice(1);
            else if (head === "#comment") rows.comments = row.slice(1);
            if (rows.names && rows.types && rows.comments) break;
        }

        const names = rows.names || [];
        const types = rows.types || [];
        const desces = rows.comments;

        const arrReg = /(.*)(\[[0-9]+\])/;
        for (let i = 0; i < names.length; i++) {
            let tname = names[i];
            if (!tname) continue;

            let ttype = types[i] || "string";
            let tdesc = desces?.[i];
            const match = arrReg.exec(tname);

            if (match) {
                const baseName = match[1];
                let tindex = 0;
                for (let j = i + 1; j < names.length; j++) {
                    if (names[j] === `${ baseName }[${ ++tindex }]`) {
                        ttype = ttype || types[j];
                        tdesc = tdesc || desces?.[j];
                        i = j;
                    } else break;
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

        const nameRowFull = datas.find(v => v[0]?.toString().trim() === "##") || [];
        const keyIndex = nameRowFull.indexOf(key);
        if (keyIndex !== -1) {
            const startRow = datas.findIndex(v => !v[0] || !v[0].trim().startsWith("#"));
            const keyMap: Record<string, boolean> = {};
            if (startRow !== -1) {
                datas.slice(startRow).forEach(v => {
                    let kVal = v[keyIndex];
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
        const dataDeclare: string[] = [];
        fieldName.forEach((v, index) => {
            if (fieldDesc[index])
                dataDeclare.push(`\t/** ${ fieldDesc[index] } */`);
            dataDeclare.push(`\t${ v }: ${ fieldType[index] };`);
        });

        const keyDeclare: string[] = [];
        const valType = (exportType === ExportType.Group) ? `${ dataDeclareName }[]` : dataDeclareName;

        if (exportType !== ExportType.NoKey) {
            keyDeclare.push(`\t[key: string]: ${ valType };`);
            keys.forEach(v => keyDeclare.push(`\t${ v }: ${ valType };`));

        }

        const declare: string[] = [
            `//#region ${ name }`,
            `declare interface ${ sheetDeclareName } {\n${ keyDeclare.join("\n") }\n}`,
            `declare interface ${ dataDeclareName } {\n${ dataDeclare.join("\n") }\n}`,
            "//#endregion",
        ];
        return declare.join("\n");
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
                sName,
                v[colMap.key],
                excel.upperName,
                v[colMap.type] as ExportType,
                v[colMap.desc] || "",
                targetRawSheet.data
            ));
        });

        if (excel.sheets.length === 0) return null;
        return excel;
    }

    getDeclare() {
        const sheetsDeclare: string[] = [];
        const keyDeclare: string[] = [];
        this.sheets.forEach(v => {
            sheetsDeclare.push(v.getDeclare());
            const desc = (v.desc ? `${ v.desc }  ---  ` : "") + v.exportType;
            keyDeclare.push(`\t/** ${ desc } */`);
            const extStr = (v.exportType === ExportType.Group) ? "CfgExtGroup" : "CfgExt";
            keyDeclare.push(`\t${ v.name }: ${ extStr }<${ v.sheetDeclareName }>;`);
        });

        const declare: string[] = [
            `declare interface ${ this.tableName } {\n${ keyDeclare.join("\n") }\n}`,
            `${ sheetsDeclare.join("\n\n") }`,
        ];
        return declare.join("\n\n");
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
            console.log(`[Build] ${ v } -> ${ excel ? "\x1b[32m成功\x1b[0m" : "\x1b[31m失败\x1b[0m" }`);
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
        ];
        fs.writeFileSync(Declare_CfgMgrPath, cfgMgrContent.join("\n"));
    }
}