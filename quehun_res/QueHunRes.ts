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
    const copyImgs = [
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_zhanxing.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_ab_match.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_activity.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_anye.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_beishuizhizhan.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_chiyu.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_createroom.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_dora3.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_huanjing.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_hunzhiyiji.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_jinzhijian.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_joinroom.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_luandou.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_mingjing.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_muyu.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_peipai.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_saishidating.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_sanrendong.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_sanrennan.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_shilian.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_sirendong.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_sirennan.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_tianming.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_tongzhijian.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_wangzuo.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_wanxiangxiuluo.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_xiuluo.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_xiuxian.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_yijushengfu.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_yinzhijian.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_yongchang.png", 
        "e:/study/IT/Projects/Laya/3.0/quehun_res/laya/assets/myres/lobby/w_yuzhijian.png",
    ];
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
        console.error("复制", r, t);
    });
    fs.writeFileSync("quehun_res/img_map.json", JSON.stringify(img_map, null, 4));
    fs.writeFileSync("quehun_res/copied_map.json", JSON.stringify(copied_map, null, 4));
}
copyImage();


