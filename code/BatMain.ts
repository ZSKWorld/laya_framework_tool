import { BuildBase } from "./BuildBase";
import { BuildConfig } from "./BuildConfig";
import { BuildConfig3_0 } from "./BuildConfig3_0";
import { BuildDataEvent } from "./BuildDataEvent";
import { BuildExcelDeclare } from "./BuildExcelDeclare";
import { BuildLebEnum } from "./BuildLebEnum";
import { BuildMaterial } from "./BuildMaterial";
import { BuildNet } from "./BuildNet";
import { BuildProtoDeclare } from "./BuildProtoDeclare";
import { BuildReplaceSpineName } from "./BuildReplaceSpineName";
import { BuildResPath2 } from "./BuildResPath2";
import { BuildResPath3_0 } from "./BuildResPath3_0";
import { BuildServerConfig } from "./BuildServerConfig";
import { BuildServerNet } from "./BuildServerNet";
import { BuildView } from "./BuildView";
import { Logger } from "./Console";

interface Builder {
    desc: string,
    cls: new () => BuildBase;
}

export class BatMain {
    constructor() {
        this.run();


        //动态require js
        // const util = require("../js/Utils").GetTemplateContent("View");

        //文件名或者目录名
        //path.basename
        //文件或目录所在目录
        //path.dirname
        //文件后缀，目录为空
        //path.extname
    }

    private run() {
        const index = +process.argv[2];
        if (isNaN(index)) return;

        const builders: Builder[] = [
            { desc: "创建 View & ViewMediator", cls: BuildView },
            { desc: "导出表配置", cls: BuildConfig },
            { desc: "更新资源路径2.0", cls: BuildResPath2 },
            { desc: "用户数据事件", cls: BuildDataEvent },
            { desc: "更新网络相关", cls: BuildNet },
            { desc: "导出服务器表配置", cls: BuildServerConfig },
            { desc: "更新服务器网络相关", cls: BuildServerNet },
            { desc: "更新ExcelDeclare", cls: BuildExcelDeclare },
            { desc: "更新Proto声明文件", cls: BuildProtoDeclare },
            { desc: "更新资源路径3.0", cls: BuildResPath3_0 },
            { desc: "导出表配置3.0", cls: BuildConfig3_0 },
            { desc: "创建材质", cls: BuildMaterial },
            { desc: "替换spine文件名", cls: BuildReplaceSpineName },
            { desc: "创建leb enum", cls: BuildLebEnum },
        ];
        if (index == -1) builders.forEach(v => this.runBuilder(v));
        else this.runBuilder(builders[index]);
        process.exit();
    }

    private runBuilder(builder: Builder) {
        if (!builder) return;
        Logger.warn("正在执行 => " + builder.desc);
        (new builder.cls()).doBuild();
        Logger.green(builder.desc + " => 执行完毕！")
    }
}
new BatMain();