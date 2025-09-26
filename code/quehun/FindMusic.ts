import * as fs from "fs";
import * as path from "path";
import * as xlsx from "node-xlsx";
import * as exceljs from "exceljs";

const suffix = ".mp3";
const oldDir = "D:\\liqi\\liqi_unity_project_dev_test\\Assets\\MyAssets\\";
const newDir = "D:\\liqi\\liqi_unity_project_dev\\Assets\\MyAssets\\";
const oldMusicMap: { [name: string]: string } = {};
const newMusicMap: { [name: string]: string } = {};
const result: { [key: string]: string } = {};

const filer = (v:string) => v.endsWith(suffix);
const oldMap = (v:string) => {
    v = v.replace(oldDir, "");
    v = v.substring(0, v.length - 4);
    return v;
};
const newMap = v => {
    v = v.replace(newDir, "");
    v = v.substring(0, v.length - 4);
    return v;
};
function getAllFile(dirPath: string, filter?: (name: string) => boolean, map?: (name: string) => string) {
    if (fs.existsSync(dirPath) == false) return [];
    const names: string[] = [];
    fs.readdirSync(dirPath).forEach(filename => {
        const filePath = path.resolve(dirPath, filename);
        const state = fs.statSync(filePath);
        if (state.isDirectory()) {
            names.push(...getAllFile(filePath, filter, map));
        } else if (state.isFile()) {
            if (!filter || filter(filename)) {
                const temp = map ? map(path.resolve(dirPath, filename)) : path.resolve(dirPath, filename);
                names.push(temp);
            }
        }
    });
    return names;
}

const oldAllMusic = [
    ...getAllFile(oldDir + "audio\\audio_event", filer, oldMap),
    ...getAllFile(oldDir + "audio\\audio_lobby", filer, oldMap),
    ...getAllFile(oldDir + "audio\\audio_mj", filer, oldMap),
    ...getAllFile(oldDir + "audio\\spot", filer, oldMap),
];
oldAllMusic.forEach(v => {
    const basename = path.basename(v);
    if (!oldMusicMap[basename]) oldMusicMap[basename] = v.replace(/\\/g, "/");
    else console.log("old重复的名字", v);
});

function getAudio(dirPath: string, filter?: (name: string) => boolean, map?: (name: string) => string) {
    if (fs.existsSync(dirPath) == false) return [];
    const names: string[] = [];
    fs.readdirSync(dirPath).forEach(filename => {
        const filePath = path.resolve(dirPath, filename);
        const state = fs.statSync(filePath);
        if (state.isDirectory()) {
            if(filename == "audio")
                names.push(...getAllFile(filePath, filter, map));
            else
                names.push(...getAudio(filePath, filter, map));
        }
    });
    return names;
}

const newAllMusic = [
    ...getAllFile(newDir + "audio\\audio_event", filer, newMap),
    ...getAllFile(newDir + "audio\\audio_common", filer, newMap),
    ...getAudio(newDir + "backup", filer, newMap),
    ...getAudio(newDir + "common3d", filer, newMap),
    ...getAudio(newDir + "deco", filer, newMap),
    ...getAudio(newDir + "docs", filer, newMap),
    ...getAudio(newDir + "docs_version", filer, newMap),
    ...getAudio(newDir + "extendRes", filer, newMap),
    ...getAudio(newDir + "fonts", filer, newMap),
    ...getAudio(newDir + "necessary", filer, newMap),
    ...getAudio(newDir + "Resources", filer, newMap),
    ...getAudio(newDir + "scenes", filer, newMap),
    ...getAudio(newDir + "shaders", filer, newMap),
    ...getAudio(newDir + "spine", filer, newMap),
    ...getAudio(newDir + "ui", filer, newMap),
];
newAllMusic.forEach(v => {
    const basename = path.basename(v);
    if (!newMusicMap[basename]) newMusicMap[basename] = v.replace(/\\/g, "/");
    else console.log("new重复的名字", v);
});

for (const key in oldMusicMap) {
    const oldV = oldMusicMap[key];
    const newV = newMusicMap[key];
    if (newV) {
        result[oldV] = newV;
    } else {
        result[oldV] = null;
    }
}

fs.writeFileSync("code/quehun/find_music.json", JSON.stringify(result));


// let sheets = xlsx.parse("D:\\liqi\\liqi-excel\\data\\audio.xlsx");
// // let audioSheet = sheets.find(v => v.name == "audio");
// // console.log(audioSheet);
// // const
// fs.writeFileSync("D:\\liqi\\liqi-excel\\data\\audio.xlsx", xlsx.build(sheets.map(v => (v["options"] = {}, v)) as any));


const workbook = new exceljs.Workbook();
workbook.xlsx.readFile("D:\\liqi\\liqi-excel\\data\\audio.xlsx").then(() => {
    const audioSheet = workbook.getWorksheet("audio");
    audioSheet.getColumn("C").values = audioSheet.getColumn("C").values.map((v: string, i) => {
        if (result[v]) return result[v];
        console.log(v);
        return v;
    });
    workbook.xlsx.writeFile("D:\\liqi\\liqi-excel\\data\\audio.xlsx");
});
workbook.xlsx.readFile("D:\\liqi\\liqi-excel\\data\\spot.xlsx").then(() => {
    const audioSheet = workbook.getWorksheet("audio_spot");
    audioSheet.getColumn("C").values = audioSheet.getColumn("C").values.map((v: string, i) => {
        const v1 = "audio/" + v;
        if (result[v1]) return result[v1];
        return v;
    });
    workbook.xlsx.writeFile("D:\\liqi\\liqi-excel\\data\\spot.xlsx");
});













