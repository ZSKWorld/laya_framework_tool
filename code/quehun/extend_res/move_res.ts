import * as fs from "fs";
import * as path from "path";

const resDir = "D:\\liqi\\majsoul-extendres\\";
const langType = ["chs", "chs_t", "common", "en", "en_chs_t", "en_kr", "jp", "kr"];

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


const allItems = JSON.parse(fs.readFileSync("code/quehun/extend_res/output/old_to_new.json").toString());
// const allItems = JSON.parse(fs.readFileSync("code/quehun/extend_res/output/new_to_old.json").toString());
langType.forEach(lang => {
    const parentDir = path.join(resDir, lang);
    for (const key in allItems) {
        const oldPath = path.join(parentDir, key);
        if (!fs.existsSync(oldPath)) continue;
        const newPath = path.join(parentDir, allItems[key]);
        if (fs.existsSync(newPath)) {
            console.log("重名文件：", oldPath.replace(resDir, ""), newPath.replace(resDir, ""));
        }
        fs.mkdirSync(path.dirname(newPath), { recursive: true });
        fs.renameSync(oldPath, newPath);
    }
    removeEmptyDir(path.join(resDir, lang, "extendRes"));
    removeEmptyDir(path.join(resDir, lang, "myres2/activity_banner"));
});
