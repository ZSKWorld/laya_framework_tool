import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

type KeyMap<T> = { [key: string]: T; };
type ExcelData = { name: string, data: string[][]; }[];
const resDir = "D:\\liqi\\majsoul-extendres_test\\audio";
const targetDir = "D:\\liqi\\liqi_unity_project_dev\\Assets\\MyAssets";
const resMd5Path = "code/quehun/extend_res/audio/resMap.json";
const targetMd5Path = "code/quehun/extend_res/audio/targetMap.json";
const resDiffNameMapPath = "code/quehun/extend_res/audio/resDiffNameMap.json";
const targetDiffNameMapPath = "code/quehun/extend_res/audio/targetDiffNameMap.json";
const resDiffMd5MapPath = "code/quehun/extend_res/audio/resDiffMd5Map.json";
const targetDiffMd5MapPath = "code/quehun/extend_res/audio/targetDiffMd5Map.json";
const old_res_map_audioPath = "code/quehun/extend_res/audio/old_res_map_audio.json";
function removeEmptyDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(v => {
        const vPath = path.resolve(dir, v);
        if (!fs.existsSync(vPath)) return;
        const stat = fs.statSync(vPath);
        if (stat.isDirectory()) {
            removeEmptyDir(vPath);
            const vDirInfos = fs.readdirSync(vPath);
            if (vDirInfos.length == 0) {
                fs.rmdirSync(vPath);
            }
        }
    });
}

function createFileMD5(filepath: string) {
    const data = fs.readFileSync(filepath);
    const md5 = crypto.createHash("md5").update(data).digest("hex");
    return md5;
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

function createMd5Map() {
    const resAudios = [
        ...getAllFile(path.join(resDir, "audio_event"), true, v => v.endsWith(".mp3")),
        ...getAllFile(path.join(resDir, "audio_lobby"), true, v => v.endsWith(".mp3")),
        ...getAllFile(path.join(resDir, "audio_mj"), true, v => v.endsWith(".mp3")),
        ...getAllFile(path.join(resDir, "spot"), true, v => v.endsWith(".mp3")),
    ];
    const targetAudios = [
        ...getAllFile(path.join(targetDir, "audio/audio_common"), true, v => v.endsWith(".mp3")),
        ...getAllFile(path.join(targetDir, "audio/audio_event"), true, v => v.endsWith(".mp3")),
        ...getAllFile(path.join(targetDir, "backup"), true, v => v.endsWith(".mp3")),
        ...getAllFile(path.join(targetDir, "common3d"), true, v => v.endsWith(".mp3")),
        ...getAllFile(path.join(targetDir, "deco"), true, v => v.endsWith(".mp3")),
        ...getAllFile(path.join(targetDir, "docs"), true, v => v.endsWith(".mp3")),
        ...getAllFile(path.join(targetDir, "docs_version"), true, v => v.endsWith(".mp3")),
        ...getAllFile(path.join(targetDir, "extendRes"), true, v => v.endsWith(".mp3")),
        ...getAllFile(path.join(targetDir, "fonts"), true, v => v.endsWith(".mp3")),
        ...getAllFile(path.join(targetDir, "necessary"), true, v => v.endsWith(".mp3")),
        ...getAllFile(path.join(targetDir, "Resources"), true, v => v.endsWith(".mp3")),
        ...getAllFile(path.join(targetDir, "scenes"), true, v => v.endsWith(".mp3")),
        ...getAllFile(path.join(targetDir, "shaders"), true, v => v.endsWith(".mp3")),
        ...getAllFile(path.join(targetDir, "spine"), true, v => v.endsWith(".mp3")),
        ...getAllFile(path.join(targetDir, "ui"), true, v => v.endsWith(".mp3")),
    ];

    const resMd5Map = { count: resAudios.length };
    const targetMd5Map = { count: targetAudios.length };

    for (let i = 0; i < resAudios.length; i++) {
        const md5 = createFileMD5(resAudios[i]);
        const relativePath = path.relative(resDir, resAudios[i]);
        const filename = path.basename(resAudios[i]);
        resMd5Map[filename] = [relativePath, md5];
    }
    fs.writeFileSync(resMd5Path, JSON.stringify(resMd5Map, null, 4));
    console.log("resAudios create completed!");

    for (let i = 0; i < targetAudios.length; i++) {
        const md5 = createFileMD5(targetAudios[i]);
        let relativePath = path.relative(targetDir, targetAudios[i]);
        if (relativePath.startsWith("deco\\effect_lizhi\\") || relativePath.startsWith("deco\\effect_hupai\\")) {
            relativePath = relativePath.replace("3d\\audio\\", "");
        }
        const filename = path.basename(targetAudios[i]);
        targetMd5Map[filename] = [relativePath, md5];
    }
    fs.writeFileSync(targetMd5Path, JSON.stringify(targetMd5Map, null, 4));
    console.log("targetAudios create completed!");
}

function checkDiffNameAudio() {
    const resMap = JSON.parse(fs.readFileSync(resMd5Path).toString());
    const targetMap = JSON.parse(fs.readFileSync(targetMd5Path).toString());

    const resDiffNameMap = {};
    for (const key in resMap) {
        if (!targetMap[key])
            resDiffNameMap[key] = resMap[key];
    }
    fs.writeFileSync(resDiffNameMapPath, JSON.stringify(resDiffNameMap, null, 4));

    const targetDiffNameMap = {};
    for (const key in targetMap) {
        if (!resMap[key])
            targetDiffNameMap[key] = targetMap[key];
    }
    fs.writeFileSync(targetDiffNameMapPath, JSON.stringify(targetDiffNameMap, null, 4));
}

function checkDiffMd5Audio() {
    const resMap = JSON.parse(fs.readFileSync(resMd5Path).toString());
    const targetMap = JSON.parse(fs.readFileSync(targetMd5Path).toString());

    const resDiffMd5Map = {};
    for (const key in resMap) {
        if (key == "count") continue;
        if (targetMap[key] && targetMap[key][1] != resMap[key][1])
            resDiffMd5Map[key] = resMap[key];
    }
    fs.writeFileSync(resDiffMd5MapPath, JSON.stringify(resDiffMd5Map, null, 4));

    const targetDiffMd5Map = {};
    for (const key in targetMap) {
        if (key == "count") continue;
        if (resMap[key] && resMap[key][1] != targetMap[key][1])
            targetDiffMd5Map[key] = targetMap[key];
    }
    fs.writeFileSync(targetDiffMd5MapPath, JSON.stringify(targetDiffMd5Map, null, 4));
}

function build() {
    createMd5Map();
    checkDiffNameAudio();
    checkDiffMd5Audio();
}

function moveRes_2020_to_2022() {
    const resMap = JSON.parse(fs.readFileSync(resMd5Path).toString());
    const targetMap = JSON.parse(fs.readFileSync(targetMd5Path).toString());
    const old_res_map_audio = {};
    for (const key in resMap) {
        if (!targetMap[key]) {
            targetMap[key] = ["unused\\" + key, ""];
        }
    }

    const otherResAudio = [
        ...getAllFile(path.join(resDir, "music"), true, v => v.endsWith(".mp3")),
        ...getAllFile(path.join(resDir, "skin"), true, v => v.endsWith(".mp3")),
        ...getAllFile(path.join(resDir, "sound"), true, v => v.endsWith(".mp3")),
    ];

    for (const key in targetMap) {
        if (key != "count" && resMap[key]) {
            old_res_map_audio[targetMap[key][0]] = resMap[key][0];
            const resPath = path.join(resDir, resMap[key][0]);
            const targetPath = path.join(resDir, targetMap[key][0]);
            if (fs.existsSync(targetPath)) {
                console.log("重名文件：", targetPath);
            }
            fs.mkdirSync(path.dirname(targetPath), { recursive: true });
            fs.renameSync(resPath, targetPath);
        }
    }

    for (let i = 0; i < otherResAudio.length; i++) {
        const relativePath = path.relative(resDir, otherResAudio[i]);
        const targetRelativePath = path.join("audio", relativePath);
        old_res_map_audio[targetRelativePath] = relativePath;
        const targetPath = path.join(resDir, targetRelativePath);
        if (fs.existsSync(targetPath)) {
            console.log("重名文件：", targetPath);
        }
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.renameSync(otherResAudio[i], targetPath);
    }
    fs.writeFileSync(old_res_map_audioPath, JSON.stringify(old_res_map_audio, null, 4));
    removeEmptyDir(resDir);
}

function moveRes_2022_to_2020() {
    const resMap = JSON.parse(fs.readFileSync(old_res_map_audioPath).toString());
    for (const key in resMap) {
        const e = resMap[key];
        const resPath = path.join(resDir, key);
        const targetPath = path.join(resDir, e);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.renameSync(resPath, targetPath);
    }
    removeEmptyDir(resDir);
}

build();

// moveRes_2020_to_2022();
// moveRes_2022_to_2020();



