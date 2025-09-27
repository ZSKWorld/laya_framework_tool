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
    const ttDir = "E:/study/IT/Projects/Laya/3.0/quehun/ui/assets/PkgCommon/Texture";
    if (!fs.existsSync(ttDir)) return console.error("目标路径不存在");
    const copyImgs = [
        "E:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/pop_panel/bg.png", 
        "E:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/pop_panel/btn_b.png", 
        "E:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/pop_panel/btn_close.png", 
        "E:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/pop_panel/btn_g.png", 
        "E:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/pop_panel/btn_w.png", 
        "E:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/pop_panel/btn_y.png", 
        "E:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/pop_panel/deco_l.png", 
        "E:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/pop_panel/deco_r.png", 
        "E:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/pop_panel/frame.png", 
        "E:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/pop_panel/slider.png", 
        "E:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/pop_panel/slider_bg.png", 
        "E:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/pop_panel/split_left.png", 
        "E:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/pop_panel/split_mid.png",
    ];
    let hasChanged = false;
    copyImgs.forEach(v => {
        if (!fs.existsSync(v)) return console.error("图片路径不存在", v);
        const md5 = createFileMD5(v);
        if (img_map[md5]) {
            const imgName = img_map[md5];
            delete img_map[md5];
            copied_map[md5] = [imgName, path.relative(tDir, ttDir)];
            fs.renameSync(path.join(targetDir, imgName), path.join(ttDir, imgName));
            hasChanged = true;
        } else if (copied_map[md5]) {
            console.error(`已复制的图片==${ v }==${ copied_map[md5][0] }==${ copied_map[md5][1] }`);
        } else {
            console.error("未记录的图片", v);
        }
    });
    if (hasChanged) {
        fs.writeFileSync("quehun_res/img_map.json", JSON.stringify(img_map, null, 4));
        fs.writeFileSync("quehun_res/copied_map.json", JSON.stringify(copied_map, null, 4));
    }
}
copyImage();


