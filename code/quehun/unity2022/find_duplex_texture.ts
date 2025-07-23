import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

type KeyMap<T> = { [key: string]: T; };

// const rootDir = "D:/liqi/liqi_unity_project_dev/Assets/MyAssets/";
const rootDir = "D:/liqi/liqi_unity_project_dev_test/Assets/MyAssets/";

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

function createFileHash256(filepath: string) {
    const data = fs.readFileSync(filepath);
    const hash = crypto.createHash("sha256").update(data).digest("hex");
    return hash;
}

function createFileMD5(filepath: string) {
    const data = fs.readFileSync(filepath);
    const md5 = crypto.createHash("md5").update(data).digest("hex");
    return md5;
}
console.log(crypto.createHash("md5").update("7abb826051674f0319925a76fa3c0276", "utf-8").digest("hex"));
// console.log("开始搜索图片......");
// const allTex = getAllFile(
//     rootDir,
//     true,
//     fname => fname.endsWith(".png") || fname.endsWith(".jpg")
// ).map(v => v.replace(/\\/g, "/"));

// const texCount = allTex.length;
// console.log("搜索完毕，数量：", texCount);
// const texMap: KeyMap<string[]> = {};
// const duplexTexMap: KeyMap<string[]> = {};
// allTex.forEach((v, i) => {
//     const t = v.replace(rootDir, "");
//     if (t.startsWith("backup/")) return;
//     if (t.includes("DevDebug")) return;
//     const md5 = createFileMD5(v);
//     if (!texMap[md5]) texMap[md5] = [t];
//     else {
//         texMap[md5].push(t);
//         if (!duplexTexMap[md5])
//             duplexTexMap[md5] = [texMap[md5][0]];
//         duplexTexMap[md5].push(t);
//     }
//     console.log(`计算进度：${ i + 1 }/${ texCount }`);
// });
// fs.writeFileSync("code/quehun/unity2022/duplex_texture_2020.json", JSON.stringify(duplexTexMap));

// const duplexKeys = Object.keys(duplexTexMap);
// const duplexKeyWeight: KeyMap<number> = duplexKeys.reduce((pv, cv, i) => {
//     pv[cv] = duplexTexMap[cv].length;
//     pv.count += pv[cv];
//     return pv;
// }, { count: 0 });
// duplexKeys.sort((a, b) => {
//     return duplexKeyWeight[b] - duplexKeyWeight[a];
// });
// const result: KeyMap<string[]> = { count: duplexKeyWeight.count } as any;
// duplexKeys.forEach(v => result[v] = duplexTexMap[v]);
// fs.writeFileSync("code/quehun/unity2022/duplex_texture_sort_2020.json", JSON.stringify(result));
