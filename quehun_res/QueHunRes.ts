import * as colors from "colors";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as ProgressBar from "progress";
import { imageSize } from "image-size";

const resDir = "E:/study/IT/Projects/Laya/3.0/quehun_res/res_ui/myres";
const targetDir = "E:/study/IT/Projects/Laya/3.0/quehun_images";

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
function getAllDir(dirPath: string, absolute?: boolean, filter?: (name: string) => boolean, map?: (name: string) => string) {
    if (fs.existsSync(dirPath) == false) return [];
    const dirs: string[] = [];
    fs.readdirSync(dirPath).forEach(filename => {
        const filePath = path.resolve(dirPath, filename);
        const state = fs.statSync(filePath);
        if (state.isDirectory()) {
            if (!filter || filter(filename)) {
                const temp = map ? map(filename) : filename;
                absolute ? dirs.push(path.resolve(dirPath, temp)) : dirs.push(temp);
            }
            dirs.push(...getAllDir(filePath, absolute, filter, map));
        }
    });
    return dirs;
}
function removeEmptyDir(dir: string) {
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

function copyImage() {
    const tDir = "E:/study/IT/Projects/Laya/3.0/quehun/ui/assets";
    const img_map = JSON.parse(fs.readFileSync("quehun_res/img_map.json").toString());
    const copied_map = JSON.parse(fs.readFileSync("quehun_res/copied_map.json").toString());
    const ttDir = "E:/study/IT/Projects/Laya/3.0/quehun/ui/assets/PkgMain/Texture";

    if (!fs.existsSync(ttDir)) return console.error("目标路径不存在");
    const a = `e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/frame_short.png`;
    const copyImgs = a.replace(/.png e:\//g, ".png!!!!e:/").replace(/.jpg e:\//g, ".jpg!!!!e:/").split("!!!!");
    let hasError = false;
    copyImgs.forEach(v => {
        if (!fs.existsSync(v)) {
            hasError = true;
        }
        const md5 = createFileMD5(v);
        if (img_map[md5]) {
            const imgName = img_map[md5];
            const targetPath = path.join(targetDir, imgName);
            
            if (!fs.existsSync(targetPath)) {
                hasError = true;
                console.error("图片不存在", v, imgName);
            }
         }
        else if (copied_map[md5]) {
            hasError = true;
            console.error(`已复制的图片 == ${ v } == ${ copied_map[md5][0] } == ${ copied_map[md5][1] }`);
        } else {
            hasError = true;
            console.error("未记录的图片", v);
        }
    });
    if (hasError) return;
    copyImgs.forEach(v => {
        const md5 = createFileMD5(v);
        if (copied_map[md5]) return;
        const imgName = img_map[md5];
        delete img_map[md5];
        copied_map[md5] = [imgName, path.relative(tDir, ttDir)];
        const r = path.join(targetDir, imgName);
        const t = path.join(ttDir, imgName);
        fs.renameSync(r, t);
        console.error("复制", v, t);
    });
    fs.writeFileSync("quehun_res/img_map.json", JSON.stringify(img_map, null, 4));
    fs.writeFileSync("quehun_res/copied_map.json", JSON.stringify(copied_map, null, 4));
}

function checkImage() {
    const rootDir = "E:\\_My\\Laya\\3.0\\quehun\\ui\\assets";
    const copied_map = JSON.parse(fs.readFileSync("quehun_res/copied_map.json").toString());
    const imgValues: [string, string][] = Object.values(copied_map);
    const errFolderImg: Record<string, string> = {};
    imgValues.forEach(v => {
        const imgPath = path.join(rootDir, v[1], v[0]);
        if (fs.existsSync(imgPath) == false) {
            errFolderImg[v[0]] = path.relative(rootDir, imgPath);
        }
    });
    const allImgs = getAllFile(rootDir, true, name => {
        name = name.toLowerCase();
        return name.endsWith(".png") || name.endsWith(".jpg");
    });
    allImgs.forEach(v => {
        const vName = path.basename(v);
        if(errFolderImg[vName]) {
            console.error(errFolderImg[vName], "=>", path.relative(rootDir, v));
        }
    });

    ////////////////////
    console.log(imgValues.length, allImgs.length);
}

// copyImage();
checkImage();


