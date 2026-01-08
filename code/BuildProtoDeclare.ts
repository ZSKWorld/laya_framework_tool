import * as fs from "fs";
import * as protobuf from "protobufjs";
import { BuildBase } from "./BuildBase";
import {
    Declare_ProtoPath,
    Declare_ReqMethodPath,
    Lib_ProtoPath,
    ProtoPath,
    ProtoReplacePath,
    TS_MODIFY_TIP
} from "./Const";

/** protobuf 类型到 TypeScript 类型映射 */
const TS_TYPE_MAP: Record<string, string> = {
    double: "number", float: "number", int32: "number", int64: "number",
    uint32: "number", uint64: "number", sint32: "number", fixed32: "number",
    fixed64: "number", sfixed32: "number", sfixed64: "number",
    bool: "boolean", string: "string", bytes: "number[]", object: "any",
};

type KeyMap<T> = { [key: string]: T };

interface IReflectionObject { comment: string; fullName: string; }
interface INamespace { nested: KeyMap<IType>; methods: KeyMap<IMethod>; notifies: KeyMap<IType>; }
interface IMethod extends IReflectionObject { requestType: string; responseType: string; }
interface IField extends IReflectionObject { rule?: "repeated"; type: string; id: number; }
interface IType extends IReflectionObject {
    filename?: string;
    methods?: KeyMap<IMethod>;
    fields?: KeyMap<IField>;
    nested?: KeyMap<IType>;
    comments?: KeyMap<string>;
    values?: KeyMap<number>;
}

export class BuildProtoDeclare extends BuildBase {
    private readonly packageName = "lq";
    private namespace: INamespace = { nested: {}, methods: {}, notifies: {} };
    private replaces: any;

    public doBuild() {
        const replaceTxt = fs.readFileSync(ProtoReplacePath, "utf-8");
        // 移除注释并解析控制替换逻辑的配置
        this.replaces = JSON.parse(replaceTxt.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, ''));

        this.loadProto();
        this.buildTS();
    }

    private getIndent(count: number): string {
        return "\t".repeat(count);
    }

    /** 提取嵌套类型至顶层，便于统一生成 interface */
    private extractSubTypes(type: IType, parent: IType, ro: protobuf.Type) {
        if (!type.nested) return;

        for (const [key, ele] of Object.entries(type.nested)) {
            const ro2 = ro.nested?.[key] as protobuf.Type;
            if (!ro2) continue;

            ele.fullName = ro2.fullName;
            if (parent) {
                parent.nested = parent.nested || {};
                parent.nested[key] = parent.nested[key] || ele;
            }
            this.extractSubTypes(ele, parent || type, ro2);
        }

        if (parent) delete type.nested;
    }

    private loadProto() {
        const root = new protobuf.Root().loadSync(ProtoPath, {
            keepCase: true, alternateCommentMode: true, preferTrailingComment: true
        });

        const firstChild = root.nestedArray[0] as protobuf.Namespace;
        if (!firstChild || !firstChild.nested) return;

        const pbNested = firstChild.nested;
        const jsonContent = firstChild.toJSON({ keepComments: true }) as INamespace;
        const nested = jsonContent.nested || {};
        const targetNs = this.namespace;

        for (const [key, type] of Object.entries(nested)) {
            const pbType = pbNested[key];
            type.fullName = pbType.fullName;

            if (type.methods) {
                // 处理 Service
                for (const [mkey, method] of Object.entries(type.methods)) {
                    const pbMethod = (pbType as protobuf.Service).methods[mkey];
                    method.fullName = pbMethod.fullName;

                    const target = targetNs.methods[mkey] || (targetNs.methods[mkey] = { ...method, comment: "" });
                    if (method.comment) target.comment += `\n${ method.comment }`;
                    target.comment += `\nreq: {@link I${ method.requestType }}\nres: {@link I${ method.responseType }}`;
                    target.comment = target.comment.trim();
                }
            } else {
                // 处理 Message
                targetNs.nested[key] = type;
                if (type.fields && key.startsWith("Notify")) {
                    targetNs.notifies[key] = type;
                }
                this.extractSubTypes(type, null, pbType as protobuf.Type);
            }
        }
    }

    private buildTSComments(comment: string, indentCount: number, includeReqRes: boolean = true): string {
        if (!comment) return "";
        const lines = comment.split("\n")
            .map(l => l.trim())
            .filter(l => l && (includeReqRes || !l.startsWith("req: {@link I")));

        if (lines.length === 0) return "";

        const tabs = this.getIndent(indentCount);
        if (lines.length === 1) return `${ tabs }/** ${ lines[0] } */\n`;

        return `${ tabs }/**\n${ lines.map(l => `${ tabs } * * ${ l }`).join('\n') }\n${ tabs } */\n`;
    }

    /** 转换字段类型 */
    private resolveFieldType(fieldType: string, isSub: boolean, ctx: { name: string, parentName: string, msg: IType, parent: IType }): string {
        const typeName = fieldType.split(".").pop() || "";
        const nested = isSub ? ctx.parent?.nested : ctx.msg.nested;

        // 1. 检查是否存在于当前的嵌套定义中
        if (nested && nested[typeName]) {
            return `I${ isSub ? ctx.parentName : ctx.name }_${ typeName }`;
        }

        // 2. 检查基础类型映射
        if (TS_TYPE_MAP[typeName]) return TS_TYPE_MAP[typeName];

        // 检查是否在根命名空间定义的 Message 或 Enum
        const rootType = this.namespace.nested[typeName];
        if (rootType && rootType.fields) return `I${ typeName }`;

        return typeName;
    }

    private buildTSMessage(name: string, msg: IType, isSub: boolean, parent?: IType, parentName: string = ""): string {
        const builder: string[] = [];
        const comments = `${ msg.fullName }${ msg.comment ? "\n" + msg.comment : "" }`;
        builder.push(this.buildTSComments(comments, 0));

        const interfaceName = `I${ isSub ? parentName + "_" : "" }${ name }`;
        const baseInterface = name.startsWith("Res") ? "IResponse" : "IProto";
        builder.push(`declare interface ${ interfaceName } extends ${ baseInterface } {\n`);

        if (msg.fields) {
            const replacer = this.replaces[msg.fullName];
            for (const [key, field] of Object.entries(msg.fields)) {
                // 特殊处理：忽略 Res 里的 Error 冗余定义
                if (key === "error" && field.type.endsWith("Error")) continue;

                builder.push(this.buildTSComments(field.comment, 1));
                const optional = !!(replacer && replacer[key] && replacer[key].optional) ? "?" : "";
                const fieldType = this.resolveFieldType(field.type, isSub, { name, parentName, msg, parent });
                const arrayKey = field.rule === "repeated" ? "[]" : "";
                builder.push(`\t${ key }${ optional }: ${ fieldType }${ arrayKey };\n`);
            }
        }

        builder.push("}\n\n");
        return builder.join('');
    }

    private buildTS() {
        const { nested, methods, notifies } = this.namespace;
        const builder = {
            notify: [] as string[],
            libNotify: [] as string[],
            req: [] as string[],
            libReq: [] as string[],
            reqMethod: [] as string[],
            message: [] as string[]
        };

        // 1. 处理 Notifies
        for (const key of Object.keys(notifies)) {
            const type = notifies[key];
            const comment = `${ type.comment || "" }\nres: {@link I${ key }}`.trim();
            builder.notify.push(`${ this.buildTSComments(comment, 1) }\t${ key } = "${ key }",\n`);
            builder.libNotify.push(`\t${ key }: "${ key }",\n`);
        }

        // 2. 处理 Methods (RPC)
        for (const [key, method] of Object.entries(methods)) {
            builder.req.push(`${ this.buildTSComments(method.comment + `\nmethod: {@link IReqMethod.${ key }}`, 1) }\t${ key } = "${ key }",\n`);
            builder.libReq.push(`\t${ key }: "${ key }",\n`);
            builder.reqMethod.push(`${ this.buildTSComments(method.comment + `\nmsgId: {@link EMessageID.${ key }}`, 1) }\t${ key }(data?: I${ method.requestType }): Promise<I${ method.responseType }>;\n`);
        }

        // 3. 处理核心 Message 内容
        builder.message.push('declare type ProtoObject<T> = Omit<T, "toJSON" | "$type">;\n\n');
        builder.message.push('declare interface IProto {\n\t$type?: protobuf.Type;\n\ttoJSON?(): ProtoObject<this>;\n}\n\n');
        builder.message.push('declare interface IResponse extends IProto {\n\terror?: IError;\n}\n\n');

        for (const [key, msg] of Object.entries(nested)) {
            // Enum 处理
            if (msg.values) {
                builder.message.push(this.buildTSComments(msg.comment, 0));
                builder.message.push(`declare const enum ${ key } {\n`);
                for (const [ekey, evalue] of Object.entries(msg.values)) {
                    builder.message.push(`${ this.buildTSComments(msg.comments?.[ekey] || "", 1) }\t${ ekey } = ${ evalue },\n`);
                }
                builder.message.push(`}\n\n`);
            }
            // Message 结构处理
            if (msg.fields) {
                builder.message.push(this.buildTSMessage(key, msg, false));
                if (msg.nested) {
                    for (const [nsKey, nsVal] of Object.entries(msg.nested)) {
                        builder.message.push(this.buildTSMessage(nsKey, nsVal, true, msg, key));
                    }
                }
            }
        }

        // 写文件
        const tip = `${ TS_MODIFY_TIP }\n`;

        fs.writeFileSync(Declare_ProtoPath, tip +
            `/** 网络通知 */\ndeclare enum ENotify {\n${ builder.notify.join('') }}\n\n` +
            `/** 网络请求协议 */\ndeclare enum EMessageID {\n${ builder.req.join('') }}\n\n` +
            builder.message.join('').trimEnd() + "\n"
        );

        fs.writeFileSync(Lib_ProtoPath, tip +
            `ENotify = {\n${ builder.libNotify.join('') }}\n\n` +
            `EMessageID = {\n${ builder.libReq.join('') }}\n`
        );

        fs.writeFileSync(Declare_ReqMethodPath, tip +
            `declare interface IReqMethod {\n${ builder.reqMethod.join('') }}\n`
        );
    }
}