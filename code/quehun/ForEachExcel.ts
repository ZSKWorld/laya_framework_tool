import * as xlsx from "node-xlsx";

function replacePathSign(str: string, reverse?: boolean) {
    if (!str) return str;
    if (typeof str != "string") return str;
    if (reverse) return str.replace(/\//g, "\\\\");
    else return str.replace(/\\/g, "/");
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

/** excel表列名转数字 */
function columnNameToNumber(columnName: string) {
    const code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = 0;
    for (let i = 0; i < columnName.length; i++) {
        const index = code.indexOf(columnName[i].toUpperCase()) + 1; // 加1是因为Excel的A是1，B是2，以此类推
        result += index * Math.pow(26, columnName.length - 1 - i); // 从右向左计算26进制数，例如AB是28（1*26^1 + 2*26^0）
    }
    return result;
}

function forEachExcel(excelName: string, sheetName: string, cb: (row: number, data: any) => void) {
    const excelData = xlsx.parse(`D:\\liqi\\liqi-excel\\data\\${ excelName }.xlsx`);
    const sheet = excelData.find(v => v.name == sheetName);
    const rows = sheet.data.length;
    const fieldNames = sheet.data.find(v => v[0] && v[0].trim() == "##");
    const startRow = sheet.data.findIndex(v => !v[0] || !v[0].startsWith("#"));
    for (let i = startRow; i < rows; i++) {
        const rowData = sheet.data[i];

        const data = {};
        fieldNames.forEach((v, i) => {
            if (!v || v.trim().startsWith("#")) return;
            data[v] = replacePathSign(rowData[i]);
        });
        cb(i, data);
    }
}

let result = [];
forEachExcel("item_definition", "item", (row, data) => {
    if (data.category == 5 && data.type == 1)
        result.push(data.id + "," + data.name_chs + "," + data);
});
console.log(result.join("\n"))

