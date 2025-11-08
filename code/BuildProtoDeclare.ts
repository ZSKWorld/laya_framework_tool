import * as fs from "fs";
import * as protobuf from "protobufjs";
import { BuildBase } from "./BuildBase";
import { Declare_ProtoPath, Declare_ReqMethodPath, Lib_ProtoPath, ProtoPath, ProtoReplacePath, TS_MODIFY_TIP } from "./Const";

const TS_TypeMap = {
    double: "number",
    float: "number",
    int32: "number",
    int64: "number",
    uint32: "number",
    uint64: "number",
    sint32: "number",
    fixed32: "number",
    fixed64: "number",
    sfixed32: "number",
    sfixed64: "number",
    bool: "boolean",
    string: "string",
    bytes: "number[]",
    object: "any",
};
const Lua_TypeMap = {
    double: "number",
    float: "number",
    int32: "number",
    int64: "number",
    uint32: "number",
    uint64: "number",
    sint32: "number",
    fixed32: "number",
    fixed64: "number",
    sfixed32: "number",
    sfixed64: "number",
    bool: "boolean",
    string: "string",
    bytes: "Uint8Array",
    object: "any",
};

type KeyMap<T> = { [key: string]: T; };

interface IReflectionObject {
    comment: string;
    fullName: string;
}

interface INamespace {
    nested?: KeyMap<IType>;
    methods?: KeyMap<IMethod>;
    notifies?: KeyMap<IType>;
}

interface IMethod extends IReflectionObject {
    requestType: string;
    responseType: string;
}

type IFieldRule = "repeated";

interface IField extends IReflectionObject {
    rule?: IFieldRule;
    type: string;
    id: number;
}

interface IType extends IReflectionObject {
    filename?: string;
    //service
    methods?: KeyMap<IMethod>;
    //message
    fields?: KeyMap<IField>;
    nested?: KeyMap<IType>;
    //enum
    comments?: KeyMap<string>;
    values?: KeyMap<number>;
}

export class BuildProtoDeclare extends BuildBase {
    private packageName = "lq";
    private luaKeywords = [
        "and", "break", "do", "else", "elseif", "end", "false", "for",
        "function", "goto", "if", "in", "local", "nil", "not", "or", "repeat",
        "return", "then", "true", "until", "while", "package", "module"
    ];
    private namespace: INamespace = { nested: {}, methods: {}, notifies: {} };
    private replaces: KeyMap<KeyMap<KeyMap<{ type: string, tsType: string, luaType: string, omissible: boolean; }>> & [string[], ...[string, string, number][]][]>;

    doBuild() {
        const replaceTxt = fs.readFileSync(ProtoReplacePath).toString();
        this.replaces = JSON.parse(replaceTxt.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, ''));
        this.loadProto();
        this.buildTS();
    }

    /** 提取嵌套type至顶层type */
    private extractSubTypes(type: IType, parent: IType, ro: protobuf.Type) {
        if (type.nested) {
            for (const key in type.nested) {
                const ele = type.nested[key];
                const ro2 = ro.nested[key] as protobuf.Type;
                ele.fullName = ro2.fullName;
                if (parent) {
                    parent.nested = parent.nested || {};
                    if (!parent.nested[key]) {
                        parent.nested[key] = ele;
                    }
                }
                this.extractSubTypes(ele, parent || type, ro2);
            }
        }
        if (parent)
            delete type.nested;
    }

    private loadProto() {
        const loadOption = { keepCase: true, alternateCommentMode: true, preferTrailingComment: true };
        const root = new protobuf.Root().loadSync(ProtoPath, loadOption);
        if (!root.nested) return;
        const pbNested = (<protobuf.Namespace>root.nestedArray[0]).nested;
        const nested = (<INamespace>(<protobuf.Namespace>root.nestedArray[0]).toJSON({ keepComments: true })).nested;
        const target_ns = this.namespace;
        for (const key in nested) {
            const type = nested[key];
            const pbType = pbNested[key];
            type.fullName = pbType.fullName;
            if (type.methods) {
                delete nested[key];
                for (const mkey in type.methods) {
                    const method = type.methods[mkey];
                    const pbMethod = (<protobuf.Service>pbType).methods[mkey];
                    method.fullName = pbMethod.fullName;
                    if (!target_ns.methods[mkey]) target_ns.methods[mkey] = method;
                    else {
                        target_ns.methods[mkey].comment = target_ns.methods[mkey].comment || "";
                        if (method.comment) target_ns.methods[mkey].comment += `\n${ method.comment }`;
                    }
                    target_ns.methods[mkey].comment = target_ns.methods[mkey].comment || "";
                    target_ns.methods[mkey].comment += `\nreq: {@link I${ method.requestType }}, res: {@link I${ method.responseType }}, msgId: {@link EMessageID.${ mkey }}`;
                    target_ns.methods[mkey].comment = target_ns.methods[mkey].comment.trim();
                }
            } else target_ns.nested[key] = type;
            if (type.fields && key.startsWith("Notify")) target_ns.notifies[key] = type;
            this.extractSubTypes(type, null, pbType as protobuf.Type);
        }
    }

    private buildTSComments(comment: string, spaceCount: number, includeReqResType: boolean = true) {
        if (!comment) return "";
        let result = `${ new Array(spaceCount).fill("\t").join("") }/**`;
        if (comment.includes("\n")) {
            const commentArr = comment.split("\n");
            if (!includeReqResType) {
                const index = commentArr.findIndex(v => v.startsWith("req: {@link I"));
                if (index >= 0) commentArr.splice(index, 1);
            }
            if (commentArr.length <= 0) return "";
            if (commentArr.length > 1) {
                commentArr.forEach(com => result += `\n${ new Array(spaceCount).fill("\t").join("") } * * ${ com }`);
                result += `\n${ new Array(spaceCount).fill("\t").join("") } */\n`;
                return result;
            }
            comment = commentArr[0];
        }
        if (includeReqResType || !comment.includes("req: {@link I"))
            result += ` ${ comment } */\n`;
        else
            result = "";
        return result;
    }

    private buildTSMessage(name: string, msg: IType, isSub: boolean, parent: IType = null, parentName: string = "") {
        let result = this.buildTSComments(`${ msg.fullName }${ msg.comment ? "\n" + msg.comment : "" }`, 0);
        result += `declare interface I${ isSub ? parentName + "_" : "" }${ name } extends ${ name.startsWith("Res") ? "IResponse" : "IProto" } {\n`;
        if (msg.fields) {
            for (const key in msg.fields) {
                const field = msg.fields[key];
                result += this.buildTSComments(field.comment, 1);
                const typeArr = field.type.split(".");
                if (typeArr[0] == this.packageName) typeArr.shift();

                const type = field.type.split(".").pop();
                const nested = isSub ? parent.nested : msg.nested;
                const isSubTypeField = nested ? !!nested[type] : false;
                const fieldType = isSubTypeField ? `I${ isSub ? parentName : name }_${ type }` : (TS_TypeMap[type] || (this.namespace.nested[type] && this.namespace.nested[type].fields ? `I${ type }` : type));
                if (key == "error" && fieldType == "IError") continue;
                result += `\t${ key }: ${ fieldType }${ field.rule == "repeated" ? "[]" : "" };\n`;
            }
        }
        result += "}\n\n";
        return result;
    }

    private buildTS() {
        const { nested, methods, notifies } = this.namespace;
        let notifyContent = "", libNotifyContent = "";
        for (const key in notifies) {
            const type = notifies[key];
            const comment = (type.comment || "") + `\nres: {@link I${ key }}`;
            notifyContent += `${ this.buildTSComments(comment.trim(), 1) }\t${ key } = "${ key }",\n`;
            libNotifyContent += `\t${ key }: "${ key }",\n`;
        }
        notifyContent = `/** 网络通知 */\ndeclare enum ENotify {\n${ notifyContent }}\n`;
        libNotifyContent = `ENotify = {\n${ libNotifyContent }}\n`;

        let reqContent = "", libReqContent = "", reqMethodContent = "";
        for (const key in methods) {
            const method = methods[key];
            reqContent += `${ this.buildTSComments(method.comment, 1) }\t${ key } = "${ key }",\n`;
            libReqContent += `\t${ key }: "${ key }",\n`;
            reqMethodContent += `${ this.buildTSComments(method.comment, 1) }\t${ key }(data?: I${ method.requestType }): Promise<I${ method.responseType }>;\n`;
        }
        reqContent = `/** 网络请求协议 */\ndeclare enum EMessageID {\n${ reqContent }}\n`;
        libReqContent = `EMessageID = {\n${ libReqContent }}\n`;
        reqMethodContent = `declare interface IReqMethod {\n${ reqMethodContent }}\n`;

        var omitproto = 'declare type ProtoObject<T> = Omit<T, "toJSON" | "$type">;\n\n';
        var iproto = "declare interface IProto {\n\t$type?: protobuf.Type;\n\ttoJSON?(): ProtoObject<this>;\n}\n\n";
        let messageContent = omitproto + iproto + "declare interface IResponse extends IProto {\n\terror?: IError;\n}\n\n";
        for (const key in nested) {
            const msg = nested[key];
            if (msg.values) {
                messageContent += this.buildTSComments(msg.comment, 0);
                messageContent += `declare const enum ${ key } {\n`;
                for (const ekey in msg.values) {
                    if (Object.prototype.hasOwnProperty.call(msg.values, ekey)) {
                        messageContent += `${ this.buildTSComments(msg.comments[ekey], 1) }\t${ ekey } = ${ msg.values[ekey] },\n`;
                    }
                }
                messageContent += `}\n\n`;
            }
            if (msg.fields) {
                messageContent += this.buildTSMessage(key, msg, false);
                if (msg.nested) {
                    for (const nsKey in msg.nested) {
                        messageContent += this.buildTSMessage(nsKey, msg.nested[nsKey], true, msg, key);
                    }
                }
            }
        }
        messageContent = messageContent.trimEnd();

        const content = `${ TS_MODIFY_TIP }\n`
            + notifyContent + "\n"
            + reqContent + "\n"
            + messageContent + "\n";
        fs.writeFileSync(Declare_ProtoPath, content);

        const libContent = `${ TS_MODIFY_TIP }\n${ libNotifyContent }\n${ libReqContent }`;
        fs.writeFileSync(Lib_ProtoPath, libContent);

        reqMethodContent = `${ TS_MODIFY_TIP }\n${ reqMethodContent }`;
        fs.writeFileSync(Declare_ReqMethodPath, reqMethodContent);
    }

}