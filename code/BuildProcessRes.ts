import * as fs from "fs";
import * as path from "path";
import { BuildBase } from "./BuildBase";
import { Lang, LangResDir, ResDir } from "./Const";
import { GetAllDir, GetAllFile } from "./Utils";


export class BuildProcessRes extends BuildBase {
    doBuild() {
        this.replaceSpineName();
        this.moveLobbyVoice();
        this.moveCharIllustTexture();
    }

    /** 替换spine文件名 */
    private replaceSpineName() {
        Lang.forEach(v => {
            const spineDir = path.join(LangResDir, v, "extendRes/charactor");
            if (fs.existsSync(spineDir) == false) return;
            const files = GetAllFile(spineDir, true, true, v => v.endsWith(".atlas.txt") || v.endsWith(".skel.txt"));
            files.forEach(v => {
                fs.renameSync(v, v.replace(".atlas.txt", ".atlas").replace(".skel.txt", ".skel"));
            });
        });
    }

    /** 移动lobby角色语音到lobby文件夹 */
    private moveLobbyVoice() {
        const targetDir = path.join(ResDir, "audio/sound");
        GetAllDir(targetDir, false, true).forEach(v => {
            const allLobbyVoice = GetAllFile(v, false, true, v => v.startsWith("lobby_") && v.endsWith(".mp3"));
            if (allLobbyVoice.length == 0) return;
            const lobbyDir = path.join(v, "lobby");
            if (!fs.existsSync(lobbyDir))
                fs.mkdirSync(lobbyDir);
            allLobbyVoice.forEach(v => {
                fs.renameSync(v, path.join(lobbyDir, path.basename(v)));
            });
        });
    }

    private moveCharIllustTexture() {
        Lang.forEach(v => {
            const charDir = path.join(LangResDir, v, "extendRes/charactor");
            if (fs.existsSync(charDir) == false) return;
            const subDirs = GetAllDir(charDir, false, false).filter(v => !isNaN(+v));
            subDirs.forEach(sv => {
                const dir = path.join(charDir, sv);
                const texes = GetAllFile(dir, true, true, v => v.endsWith(".png") || v.endsWith(".jpg"));
                texes.forEach(v => {
                    const filename = path.basename(v);
                    fs.renameSync(v, path.join(dir, filename));
                });
            });
        });
    }
}