import * as fs from "fs";
import * as path from "path";
import { BuildBase } from "./BuildBase";
import { Lang, LangResDir } from "./Const";
import { GetAllFile } from "./Utils";


export class BuildReplaceSpineName extends BuildBase {
    doBuild() {
        Lang.forEach(v => {
            const spineDir = path.join(LangResDir, v, "extendRes/charactor");
            if (fs.existsSync(spineDir) == false) return;
            const files = GetAllFile(spineDir, true, v => v.endsWith(".atlas.txt") || v.endsWith(".skel.txt"));
            files.forEach(v => {
                fs.renameSync(v, v.replace(".atlas.txt", ".atlas").replace(".skel.txt", ".skel"));
            });
        });
    }

}