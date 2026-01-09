import * as fs from "fs";
import * as path from "path";
import { BuildBase } from "./BuildBase";
import { Logger } from "./Console";
import { Declare_ViewIDPath, InitViewCommandPath, Lib_ViewIDPath, MediatorBasePath, TS_MODIFY_TIP, UiDir, ViewDir } from "./Const";
import { GetAllFile, GetTemplateContent, MakeDir, UpperFirst } from "./Utils";

interface IBuildConfig {
    sign: string;
    folder: string;
    uiType: string;
    comments: string;
    generateMediator: boolean;
}

/** 格式化路径为 POSIX 风格 (用于 Import/URL) */
const toPosixPath = (str: string) => str.replace(/\\/g, "/");

export class BuildView extends BuildBase {
    // 预加载模板
    private readonly templates = {
        view: GetTemplateContent("View"),
        mediator: GetTemplateContent("Mediator"),
        viewID: GetTemplateContent("ViewID"),
        viewIDDeclare: GetTemplateContent("ViewIDDeclare"),
        initViewCommand: GetTemplateContent("InitViewCommand")
    };

    protected buildConfig: IBuildConfig[] = [
        { sign: "Btn", folder: "btns", uiType: "Button", comments: "Btns", generateMediator: false },
        { sign: "Render", folder: "renders", uiType: "Render", comments: "Renders", generateMediator: false },
        { sign: "Com", folder: "coms", uiType: "Component", comments: "Coms", generateMediator: false },
        { sign: "UI", folder: "uis", uiType: "UI", comments: "UIs", generateMediator: true },
    ];

    doBuild() {
        this.runBuildTasks();
        this.removeUnused();
        this.buildViewID();
        this.buildViewRegister();
    }

    /** 核心扫描与构建逻辑 */
    private runBuildTasks() {
        const allTsFiles = GetAllFile(UiDir, true, (f) => f.endsWith(".ts"));

        for (const fullPath of allTsFiles) {
            const filename = path.basename(fullPath, ".ts");
            const dirPath = path.dirname(fullPath);

            const config = this.buildConfig.find(c => filename.startsWith(c.sign));
            if (!config) continue;

            const pkgName = path.basename(dirPath);
            this.buildViewFile(dirPath, filename, config.folder);

            if (config.generateMediator) {
                this.buildMediatorFile(dirPath, filename, config.folder);
            }
        }
    }

    /** 提取 UI 脚本中的按钮组件信息 */
    private parseUIComponents(dirPath: string, filename: string) {
        const fullPath = path.resolve(dirPath, `${ filename }.ts`);
        const content = fs.readFileSync(fullPath, "utf-8");
        const matches = content.match(/(public|protected)\s+(\w+)\s*:\s*.*?;/g) || [];

        const btns: string[] = [];
        matches.forEach(line => {
            if (line.includes("static")) return;
            const varName = line.split(/\s+/)[1].split(":")[0];
            if (varName.toLowerCase().startsWith("btn")) {
                btns.push(varName);
            }
        });
        return btns;
    }

    private buildViewFile(dirPath: string, filename: string, subDir: string) {
        const targetDir = path.resolve(ViewDir, path.basename(dirPath), "view", subDir);
        const viewPath = path.resolve(targetDir, `${ filename }View.ts`);

        if (fs.existsSync(viewPath)) return;
        MakeDir(targetDir);

        const btns = this.parseUIComponents(dirPath, filename);
        const msgEnumName = `E${ filename }Msg`;

        let messages: string[] = [];
        let sendEvents: string[] = [];
        let useComps: string[] = [];

        btns.forEach(btn => {
            const msgName = `On${ UpperFirst(btn, ["_"], "") }Click`;
            messages.push(`\t${ msgName } = "${ filename }_${ msgName }",`);
            sendEvents.push(`\t\t${ btn }.onClick(this, this.sendEvent, [${ msgEnumName }.${ msgName }]);`);
            useComps.push(btn);
        });

        const compContent = useComps.length > 0
            ? `const { ${ useComps.join(", ") } } = this;\n${ sendEvents.join("\n") }`
            : sendEvents.join("\n");

        const viewRelPath = toPosixPath(path.relative(targetDir, path.resolve(dirPath, filename)));

        const result = this.templates.view
            .replace(/#VIEW_PATH#/g, viewRelPath)
            .replace(/#CLASS_NAME#/g, `${ filename }View`)
            .replace(/#FILE_NAME#/g, filename)
            .replace(/#ALL_COMP#/g, compContent)
            .replace(/#MESSAGES#/g, messages.join("\n").trimEnd())
            .replace(/#COMP_EXTENSION#/g, ""); // 保持原逻辑为空

        fs.writeFileSync(viewPath, result);
        console.log(`${ filename }View`);
    }

    private buildMediatorFile(dirPath: string, filename: string, subDir: string) {
        const pkgName = path.basename(dirPath);
        const targetDir = path.resolve(ViewDir, pkgName, "mediator", subDir);
        const mediatorPath = path.resolve(targetDir, `${ filename }Mediator.ts`);

        if (fs.existsSync(mediatorPath)) return;
        MakeDir(targetDir);

        const viewPath = path.resolve(ViewDir, pkgName, "view", subDir, `${ filename }View.ts`);
        const btns = this.parseUIComponents(dirPath, filename);
        const viewMsg = `E${ filename }Msg`;

        let msgCodes: string[] = [];
        let funcCodes: string[] = [];

        btns.forEach(btn => {
            const btnName = UpperFirst(btn, ["_"], "");
            msgCodes.push(`\t\tthis.addEvent(${ viewMsg }.On${ btnName }Click, this.on${ btnName }Click);`);
            funcCodes.push(`\tprivate on${ btnName }Click() {\n\n\t}\n`);
        });

        const result = this.templates.mediator
            .replace(/#MEDIATOR_BASE_PATH#/g, toPosixPath(path.relative(targetDir, MediatorBasePath)).replace(".ts", ""))
            .replace(/#VIEW_PATH#/g, toPosixPath(path.relative(targetDir, viewPath)).replace(".ts", ""))
            .replace(/#CLASS_NAME#/g, `${ filename }Mediator`)
            .replace(/#VIEW_CLASS#/g, `${ filename }View`)
            .replace(/#VIEW_MSG#/g, viewMsg)
            .replace(/#DATA_NAME#/g, `I${ filename }Data`)
            .replace(/#BTN_MESSAGE#/g, msgCodes.join("\n").trim())
            .replace(/#BTN_FUNCTIONS#/g, funcCodes.length > 0 ? `\n${ funcCodes.join("\n") }` : "");

        fs.writeFileSync(mediatorPath, result);
        console.log(`${ filename }Mediator`);
    }

    private removeUnused() {
        GetAllFile(ViewDir, true, f => f.endsWith("View.ts") || f.endsWith("Mediator.ts"))
            .forEach(filepath => {
                const relative = path.relative(ViewDir, filepath);
                const parts = relative.split(path.sep);
                if (parts.length < 3) return;

                const [pkgName, dirType] = parts;
                if (dirType !== "mediator" && dirType !== "view") return;

                const baseName = path.basename(filepath, ".ts");
                const uiRawName = baseName.replace(dirType === "view" ? "View" : "Mediator", "");

                const uiPath = path.resolve(UiDir, pkgName, `${ uiRawName }.ts`);
                if (!fs.existsSync(uiPath)) {
                    Logger.error(`删除冗余 => ${ filepath }`);
                    fs.unlinkSync(filepath);
                }
            });
    }

    private buildViewID() {
        const buildSigns = this.buildConfig.map(c => c.sign);
        const viewFiles = GetAllFile(ViewDir, true, f =>
            f.endsWith("View.ts") && buildSigns.some(s => path.basename(f).startsWith(s))
        );

        const groups = this.buildConfig.map(config => {
            const items = viewFiles
                .filter(f => path.basename(f).startsWith(config.sign))
                .map(f => `\t${ path.basename(f, ".ts") } = "${ path.basename(f, ".ts") }",`)
                .join("\n");

            return items ? `\t/**${ config.comments } */\n${ items }` : "";
        }).filter(v => v !== "");

        let content = groups.join("\n\n");
        if (!content) content = "\tNone = \"\",";

        const libContent = this.templates.viewID
            .replace("#CONTENT#", content)
            .replace(/ =/g, ":")
            .replace("export enum EViewID", "EViewID =");
        fs.writeFileSync(Lib_ViewIDPath, [TS_MODIFY_TIP, libContent].join("\n"));

        const declareContent = this.templates.viewIDDeclare.replace("#CONTENT#", content);
        fs.writeFileSync(Declare_ViewIDPath, [TS_MODIFY_TIP, declareContent].join("\n"));
    }

    private buildViewRegister() {
        const cmdDir = path.dirname(InitViewCommandPath);
        const binderFiles = GetAllFile(UiDir, true, f => f.endsWith("Binder.ts"));

        let binderCodes: string[] = [];
        let registerCodes: string[] = [];
        let importLines = new Set<string>(); // 使用 Set 防止重复导入

        binderFiles.forEach(f => {
            const clsName = path.basename(f, ".ts");
            binderCodes.push(`\t\t${ clsName }.bindAll();`);
            importLines.add(`import ${ clsName } from "${ toPosixPath(path.relative(cmdDir, f)).replace(".ts", "") }";`);
        });

        this.buildConfig.forEach(config => {
            const uiFiles = GetAllFile(UiDir, true, f => path.basename(f).startsWith(config.sign) && f.endsWith(".ts") && !f.endsWith("Binder.ts"));
            if (uiFiles.length === 0) return;

            registerCodes.push(`\n\t\t//${ config.comments }`);
            uiFiles.forEach(f => {
                const baseName = path.basename(f, ".ts");
                // 路径转换逻辑映射: ui/Pkg/Name.ts -> view/Pkg/view/folder/NameView.ts
                const pkgName = path.basename(path.dirname(f));
                const viewPath = path.resolve(ViewDir, pkgName, "view", config.folder, `${ baseName }View.ts`);
                const mediatorPath = path.resolve(ViewDir, pkgName, "mediator", config.folder, `${ baseName }Mediator.ts`);

                if (fs.existsSync(viewPath)) {
                    let regLine = `\t\tregister(EViewID.${ baseName }View, EViewType.${ config.uiType }, ${ baseName }View`;
                    importLines.add(`import { ${ baseName }View } from "${ toPosixPath(path.relative(cmdDir, viewPath)).replace(".ts", "") }";`);

                    if (fs.existsSync(mediatorPath)) {
                        regLine += `, ${ baseName }Mediator`;
                        importLines.add(`import { ${ baseName }Mediator } from "${ toPosixPath(path.relative(cmdDir, mediatorPath)).replace(".ts", "") }";`);
                    }
                    registerCodes.push(`${ regLine });`);
                }
            });
        });

        const result = this.templates.initViewCommand
            .replace("#IMPORT#", Array.from(importLines).join("\n"))
            .replace("#BINDER_CODE#", binderCodes.join("\n").trim())
            .replace("#REGISTER_CODE#", registerCodes.join("\n").trim());

        fs.writeFileSync(InitViewCommandPath, result);
    }
}