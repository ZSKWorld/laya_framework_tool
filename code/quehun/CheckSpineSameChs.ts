import * as crpto from "crypto";
import * as fs from "fs";
import * as path from "path";



function createFileMD5(filepath: string) {
    const data = fs.readFileSync(filepath);
    const md5 = crpto.createHash("md5").update(data).digest("hex");
    return md5;
}

function createFolderMD5(folderPath: string) {
    if (!fs.existsSync(folderPath)) return "";
    let md5 = "";
    fs.readdirSync(folderPath).forEach(v => {
        md5 += createFileMD5(path.join(folderPath, v));
    });
    return crpto.createHash("md5").update(md5).digest("hex");
}

function getLangSpineMd5(lang: string) {
    const md5Map = {};
    const langPath = path.resolve("bin", lang, "extendRes/charactor");
    fs.readdirSync(langPath).forEach(v => {
        const vPath = path.join(langPath, v)
        const stat = fs.statSync(vPath);
        if (!stat.isDirectory()) return;
        const spinePath = path.resolve(vPath, "spine");
        if (!fs.existsSync(spinePath)) return;
        md5Map[path.relative(langPath, spinePath)] = createFolderMD5(spinePath);
    });
    return md5Map;
}

const chsSpineMd5Map = getLangSpineMd5("");
const lang = ["chs_t", "en", "jp", "kr"];
lang.forEach(v => {
    const spineMd5Map = getLangSpineMd5(v);
    for (const key in chsSpineMd5Map) {
        const e = chsSpineMd5Map[key];
        if (!spineMd5Map[key] || spineMd5Map[key] != chsSpineMd5Map[key])
            console.log("不一样的spine：", v, key, spineMd5Map[key], chsSpineMd5Map[key]);
    }
    // console.log(spineMd5Map);
});