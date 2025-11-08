import * as fs from "fs";
import * as path from "path";
import { BuildBase } from "./BuildBase";
import { Logger } from "./Console";
import { Declare_ViewIDPath, InitViewCommandPath, Lib_ViewIDPath, MediatorBasePath, UiDir, ViewDir } from "./Const";
import { GetAllFile, GetTemplateContent, MakeDir, UpperFirst } from "./Utils";
export class BuildView extends BuildBase {
    private viewTemplate = GetTemplateContent("View");
    private mediatorTemplate = GetTemplateContent("Mediator");
    private viewIDTemplate = GetTemplateContent("ViewID");
    private viewIDDeclareTemplate = GetTemplateContent("ViewIDDeclare");
    private initViewCommandTemplate = GetTemplateContent("InitViewCommand");

    protected buildFilter = [
        { sign: "UI", funcs: [this.BuildView, this.BuildMediator] },
        { sign: "Com", funcs: [this.BuildView, this.BuildMediator], subDir: "coms" },
        { sign: "Btn", funcs: [this.BuildView], subDir: "btns" },
        { sign: "Render", funcs: [this.BuildView], subDir: "renders" },
    ];

    doBuild() {
        this.CheckBuild(UiDir);
        this.RemoveUnused();
        this.BuildViewID();
        this.BuildViewRegister();
    }

    private CheckBuild(dirPath: string) {
        fs.readdirSync(dirPath).forEach(filename => {
            const filePath = path.resolve(dirPath, filename);
            const info = fs.statSync(filePath);
            if (info.isDirectory()) {
                this.CheckBuild(filePath);
            }
            else if (info.isFile()) {
                this.buildFilter.forEach(filter => {
                    if (filename.endsWith(".ts") && filename.startsWith(filter.sign))
                        filter.funcs.forEach(func => func.call(this, dirPath, filename.replace(".ts", ""), filter.subDir || ""));
                });
            }
        });
    }

    private BuildView(dirPath: string, filename: string, subDir: string = "") {
        const viewDir = path.resolve(ViewDir, path.basename(dirPath) + "/view/" + subDir);
        MakeDir(viewDir);
        const [viewCls, viewPath, pkgName] = [
            filename + "View",
            path.resolve(viewDir, filename + "View.ts"),
            path.basename(dirPath),
        ];
        if (!fs.existsSync(viewPath)) {
            let content = this.viewTemplate;
            content = content.replace(/#VIEW_PATH#/g, path.relative(viewDir, path.resolve(dirPath, filename)).replace(/\\/g, "/").replace(/\.ts/g, ""))
                .replace(/#CLASS_NAME#/g, viewCls)
                // .replace(/#PACKAGE_NAME#/g, pkgName)
                .replace(/#FILE_NAME#/g, filename);

            let [sendContent, compContent, compExtension, messages] = ["", "", "\n", ""];

            const matches = fs.readFileSync(path.resolve(dirPath, filename + ".ts")).toString().match(/public.*:.*;/g);
            const uiComps = matches ? matches.filter(v => !v.includes("static")) : [];
            // const uiComps = fs.readFileSync(path.resolve(dirPath, filename + ".ts")).toString().match(/public((?!static).)*;/g);
            if (uiComps.length > 0) {
                let msgEnumName = `E${ filename }Msg`;
                let useComps = [];
                uiComps.forEach((v, index) => {
                    const [varName, varType] = v.substring(7, v.length - 1).split(":");
                    if (varName.toLowerCase().startsWith("btn")) {
                        let msgName = `On${ UpperFirst(varName, ["_"], "") }Click`;
                        let msgValue = `"${ filename }_${ msgName }"`;
                        messages += `\t${ msgName } = ${ msgValue },\n`;
                        sendContent += `\n\t\t${ varName }.onClick(this, this.sendEvent, [${ msgEnumName }.${ msgName }]);`;
                    } else return;
                    useComps.push(varName);
                });

                compContent = useComps.length > 0 ? `const { ${ useComps.join(", ") } } = this;${ sendContent }` : sendContent;
            }

            content = content.replace(/#ALL_COMP#/g, compContent)
                .replace(/#MESSAGES#/g, messages.trimEnd())
                .replace(/#COMP_EXTENSION#/g, compExtension.trimEnd());
            console.log(viewCls);
            fs.writeFileSync(viewPath, content);
        }
    }

    private BuildMediator(dirPath: string, filename: string, subDir: string) {
        const _viewDir = path.resolve(ViewDir, path.basename(dirPath) + "/view/" + subDir);
        const _mediatorDir = path.resolve(ViewDir, path.basename(dirPath) + "/mediator/" + subDir);
        MakeDir(_mediatorDir);
        const [viewCls, viewMsg, mediatorCls, dataName, viewPath, mediatorPath, pkgName] = [
            filename + "View",
            "E" + filename + "Msg",
            filename + "Mediator",
            "I" + filename + "Data",
            path.resolve(_viewDir, filename + "View.ts"),
            path.resolve(_mediatorDir, filename + "Mediator.ts"),
            path.basename(dirPath),
        ];
        if (!fs.existsSync(mediatorPath)) {
            let content = this.mediatorTemplate;
            content = content.replace(/#MEDIATOR_BASE_PATH#/g, path.relative(_mediatorDir, MediatorBasePath).replace(/\\/g, "/").replace(/\.ts/g, ""))
                .replace(/#VIEW_PATH#/g, path.relative(_mediatorDir, viewPath).replace(/\\/g, "/").replace(/\.ts/g, ""))
                .replace(/#CLASS_NAME#/g, mediatorCls)
                // .replace(/#PACKAGE_NAME#/g, pkgName)
                .replace(/#VIEW_CLASS#/g, viewCls)
                .replace(/#VIEW_MSG#/g, viewMsg)
                .replace(/#DATA_NAME#/g, dataName);
            let [msgContent, funcContent] = ["", ""];
            const matches = fs.readFileSync(path.resolve(dirPath, filename + ".ts")).toString().match(/public.*:.*;/g);
            const uiComps = matches ? matches.filter(v => !v.includes("static")) : [];
            if (uiComps.length > 0) {
                uiComps.forEach(v => {
                    v = v.split(" ")[1].split(":")[0];
                    if (v.toLowerCase().startsWith("btn")) {
                        const btnName = UpperFirst(v, ["_"], "");
                        msgContent += `\t\tthis.addEvent(${ viewMsg }.On${ btnName }Click, this.on${ btnName }Click);\n`;
                        funcContent += `\tprivate on${ btnName }Click() {\n\n\t}\n\n`;
                    }
                });
                msgContent = msgContent ? msgContent.trim() : msgContent;
                funcContent = funcContent ? `\n\t${ funcContent.trim() }\n` : funcContent;
            }
            content = content.replace(/#BTN_MESSAGE#/g, msgContent);
            content = content.replace(/#BTN_FUNCTIONS#/g, funcContent);
            console.log(mediatorCls);
            fs.writeFileSync(mediatorPath, content);
        }
    }

    private RemoveUnused() {
        GetAllFile(
            ViewDir, true,
            filename => filename.endsWith("View.ts") || filename.endsWith("Mediator.ts")
        ).forEach(filepath => {
            const relative = path.relative(ViewDir, filepath);
            const relativeArr = relative.split("\\");
            const pkgname = relativeArr[0];
            const dir = relativeArr[1];
            if (dir != "mediator" && dir != "view") return;
            const filename = path.basename(relative, ".ts");
            let uiname = "";
            if (filename.endsWith("View")) uiname = filename.substring(0, filename.length - 4);
            else if (filename.endsWith("Mediator")) uiname = filename.substring(0, filename.length - 8);
            else return;
            const uipath = path.resolve(UiDir, pkgname, uiname + ".ts");
            if (!fs.existsSync(uipath)) {
                Logger.error("删除=>" + filepath);
                fs.unlinkSync(filepath);
            }
        });
    }

    private GetViewIDContent() {
        let [btns, renders, coms, views] = [
            "\t/**Btns */\n",
            "\t/**Renders */\n",
            "\t/**Coms */\n",
            "\t/**UIs */\n"
        ];
        const viewNames = GetAllFile(
            ViewDir, false,
            filename => (filename.startsWith("Btn")
                || filename.startsWith("Render")
                || filename.startsWith("Com")
                || filename.startsWith("UI")) && filename.endsWith("View.ts"),
            filename => filename.replace(".ts", ""),
        );
        let viewCount = 0;
        viewNames.forEach(v => {
            if (v.startsWith("UI")) {
                views += `\t${ v } = "${ v }",\n`;
            } else if (v.startsWith("Com")) {
                coms += `\t${ v } = "${ v }",\n`;
            } else if (v.startsWith("Btn")) {
                btns += `\t${ v } = "${ v }",\n`;
            } else if (v.startsWith("Render")) {
                renders += `\t${ v } = "${ v }",\n`;
            }
            else
                return;
            viewCount++;
        });
        let combine = btns + "\n" + renders + "\n" + coms + "\n" + views;
        if (viewCount == 0) combine = "\tNone = \"\",\n" + combine;
        return combine;
    }

    private BuildViewID() {
        const content = this.GetViewIDContent();
        const viewIDContent = this.viewIDTemplate.replace("#CONTENT#", content).replace(/ =/g, ":").replace("export enum EViewID", "EViewID =");
        fs.writeFileSync(Lib_ViewIDPath, viewIDContent);
        const viewIDDeclareContent = this.viewIDDeclareTemplate.replace("#CONTENT#", content);
        fs.writeFileSync(Declare_ViewIDPath, viewIDDeclareContent);
    }

    private BuildViewRegister() {
        const initViewCommandDir = path.dirname(InitViewCommandPath);
        const mapFunc = (fileName: string) => fileName.replace(".ts", "");
        const filterFunc = (start: string, end: string) => (fileName: string) => (!start || fileName.startsWith(start)) && (!end || fileName.endsWith(end));

        const binderNames = GetAllFile(UiDir, true, filterFunc("", "Binder.ts"), mapFunc);
        const uiNames = GetAllFile(UiDir, true, filterFunc("UI", ".ts"), mapFunc);
        const btnNames = GetAllFile(UiDir, true, filterFunc("Btn", ".ts"), mapFunc);
        const comNames = GetAllFile(UiDir, true, filterFunc("Com", ".ts"), mapFunc);
        const renderNames = GetAllFile(UiDir, true, filterFunc("Render", ".ts"), mapFunc);

        let [binderCode, registerCode, imports] = ["", "", []];

        binderNames.forEach(v => {
            const basename = path.basename(v);
            binderCode += `\t\t${ basename }.bindAll();\n`;
            imports.push(`import ${ basename } from "${ path.relative(initViewCommandDir, v).replace(/\\/g, "/") }";`);
        });

        const subDirMap = { Btns: "btns\\", Renders: "renders\\", Coms: "coms\\", UIs: "" };
        const addExtAndRegistCode = (arr: string[], desc: string, viewType: string) => {
            registerCode += `\n\t\t//${ desc }\n`;
            arr.forEach(v => {
                const basename = path.basename(v);
                const tempPath = v.replace("ui\\Pkg", "view\\Pkg");
                const viewPath = tempPath.replace(basename, "view\\" + subDirMap[desc] + basename + "View.ts");
                const mediatorPath = tempPath.replace(basename, "mediator\\" + subDirMap[desc] + basename + "Mediator.ts");
                if (fs.existsSync(viewPath)) {
                    registerCode += `\t\tregister(EViewID.${ basename }View, EViewType.${ viewType }, ${ basename }View`;
                    imports.push(`import { ${ basename }View } from "${ path.relative(initViewCommandDir, mapFunc(viewPath)).replace(/\\/g, "/") }";`);
                    if (fs.existsSync(mediatorPath)) {
                        registerCode += ", " + basename + "Mediator";
                        imports.push(`import { ${ basename }Mediator } from "${ path.relative(initViewCommandDir, mapFunc(mediatorPath)).replace(/\\/g, "/") }";`);
                    }
                    registerCode += ");\n";
                }
            });
        };
        addExtAndRegistCode(btnNames, "Btns", "Button");
        addExtAndRegistCode(renderNames, "Renders", "Render");
        addExtAndRegistCode(comNames, "Coms", "Component");
        addExtAndRegistCode(uiNames, "UIs", "UI");

        let content = this.initViewCommandTemplate
            .replace("#IMPORT#", imports.join("\n"))
            .replace("#BINDER_CODE#", binderCode.trim())
            .replace("#REGISTER_CODE#", registerCode.trim());
        fs.writeFileSync(InitViewCommandPath, content);
    }
}