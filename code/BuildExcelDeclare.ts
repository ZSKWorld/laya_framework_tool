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
        const names = datas.find(v => v[0]?.trim().startsWith("##")).slice(1);
        const types = datas.find(v => v[0]?.trim().startsWith("#type")).slice(1);
        const desces = datas.find(v => v[0]?.trim().startsWith("#comment"))?.slice(1);
        this.fieldName = [];
        this.fieldType = [];
        this.fieldDesc = [];
        const arrReg = /(.*)(\[[0-9]+\])/;
        for (let i = 0; i < names.length; i++) {
            let tname = names[i];
            let ttype = types[i] || "string";
            let tdesc = desces?.[i];
            const match = arrReg.exec(names[i])
            if (match) {
                let tindex = 0;
                tname = match[1];
                for (let j = i + 1; j < names.length; j++) {
                    const nextName = `${ tname }[${ ++tindex }]`;
                    if (names[j] == nextName) {
                        ttype = ttype || types[j];
                        tdesc = tdesc || desces?.[i];
                        i = j;
                    } else break;
                }
                ttype = typeMap[ttype] + "[]";
            } else {
                ttype = typeMap[ttype];
            }
            this.fieldName.push(tname);
            this.fieldType.push(ttype);
            this.fieldDesc.push(tdesc);
        }
        const keyIndex = datas.find(v => v[0]?.trim().startsWith("##")).findIndex(v => v == key);
        const startRow = datas.findIndex(v => !v[0] || !v[0].trim().startsWith("#"));
        const rows = datas.slice(startRow);
        const keyMap: { [key: string]: boolean } = {};
        rows.forEach(v => {
            let key = v[keyIndex];
            if (!key) return;
            if (typeof (key) == "string" && (key.includes(" ") || key.includes(" ")))
                key = `"${ key }"`;
            keyMap[key] = true;
        });
        this.keys = Object.keys(keyMap);
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
        if (exportType == ExportType.Group) {
            keys.forEach(v => keyDeclare.push(`\t${ v }: ${ dataDeclareName }[];`));
        } else if (exportType == ExportType.Unique) {
            keys.forEach(v => keyDeclare.push(`\t${ v }: ${ dataDeclareName };`));
        } else if (exportType == ExportType.KV) {
            keys.forEach(v => keyDeclare.push(`\t${ v }: ${ dataDeclareName };`));
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
        if (!fs.existsSync(excelPath)) return null;
        if (!fs.statSync(excelPath).isFile()) return null;
        const fileName = path.basename(excelPath);
        if (HasChinese(fileName)) return null;
        if (!fileName.endsWith(".xlsx")) return null;
        const sheets = xlsx.parse(excelPath).filter(v => !HasChinese(v.name));
        const exportSheet = sheets.find(v => v.name == "export");
        if (!exportSheet || exportSheet.data.length <= 1) return null;
        const exportKeys = exportSheet.data.shift();
        const sheetIndex = exportKeys.findIndex(v => v == "sheet");
        const keyIndex = exportKeys.findIndex(v => v == "key");
        const typeIndex = exportKeys.findIndex(v => v == "type");
        const descIndex = exportKeys.findIndex(v => v == "desc");
        const exportInfo: { [name: string]: { key: string, type: ExportType, desc: string } } = {};
        exportSheet.data.forEach(v => {
            if (!v[sheetIndex]) return;
            exportInfo[v[sheetIndex]] = { key: v[keyIndex], type: v[typeIndex], desc: v[descIndex] };
        });
        if (Object.keys(exportInfo).length == 0) return;

        const excel = new ExcelData();
        excel.name = path.basename(fileName, ".xlsx");
        excel.upperName = UpperFirst(excel.name, ["_"], "");
        excel.sheets = [];
        for (const key in exportInfo) {
            const sheet = sheets.find(v => v.name == key);
            if (!sheet) continue;
            const info = exportInfo[key];
            excel.sheets.push(new SheetData(key, info.key, excel.upperName, info.type, info.desc, sheet.data));
        }
        return excel;
    }

    getDeclare() {
        const sheetsDeclare: string[] = [];
        const keyDeclare: string[] = [];
        this.sheets.forEach(v => {
            sheetsDeclare.push(v.getDeclare());
            const desc = (v.desc ? `${ v.desc }  ---  ` : "") + v.exportType;
            keyDeclare.push(`\t/** ${ desc } */`);
            keyDeclare.push(`\t${ v.name }: CfgExt<${ v.sheetDeclareName }>;`);
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
        const excels: ExcelData[] = [];
        fs.readdirSync(ExcelDir).forEach(v => {
            const excel = ExcelData.createExcel(path.resolve(ExcelDir, v));
            if (!excel) return;
            excels.push(excel);
        });
        const excelDeclare: string[] = [];
        excels.forEach(v => {
            excelDeclare.push(`\treadonly ${ v.name }: ${ v.tableName };`)
            fs.writeFileSync(`${ Declare_ExcelDir }/${ v.name }.d.ts`, v.getDeclare());
        });

        const cfgMgrContent = [
            `declare interface IConfigManager {`,
            excelDeclare.join("\n"),
            `\tinit(): Promise<void>;`,
            `}\n\n`,
            GetTemplateContent("cfgMgr3.0"),
        ];
        fs.writeFileSync(Declare_CfgMgrPath, cfgMgrContent.join("\n"));
    }

}
