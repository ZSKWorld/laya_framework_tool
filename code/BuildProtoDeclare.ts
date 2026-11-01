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

interface INamespace { name: string, fullName: string, root: protobuf.Namespace, methods: protobuf.Method[]; notifies: protobuf.Type[]; messages: protobuf.Type[]; enums: protobuf.Enum[]; }


const GetIndent = (count: number) => "\t".repeat(count);
const IsNotify = (name: string) => name.startsWith("Notify");
const IsRequest = (name: string) => name.startsWith("Req");
const IsResponse = (name: string) => name.startsWith("Res");

export class BuildProtoDeclare extends BuildBase {
	private namespace: INamespace = { name: "", fullName: "", root: null, methods: [], notifies: [], messages: [], enums: [] };
	private replaces: any = {};

	public doBuild() {
		if (fs.existsSync(ProtoReplacePath)) {
			const replaceTxt = fs.readFileSync(ProtoReplacePath, "utf-8");
			// 移除注释并解析控制替换逻辑的配置
			this.replaces = JSON.parse(replaceTxt.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, ''));
		}

		this.loadProto();
		this.buildTS();
	}

	private loadProto() {
		const ProtoPath = "E:/study/IT/Projects/Laya/3.0/quehun/source/bin/proto/client.proto";
		const root = new protobuf.Root().loadSync(ProtoPath, {
			keepCase: true, alternateCommentMode: true, preferTrailingComment: true
		});

		const firstChild = root.nestedArray[0] as protobuf.Namespace;
		if (!firstChild || !firstChild.nested) return;

		const ns = this.namespace;
		ns.name = firstChild.name;
		ns.fullName = firstChild.fullName;
		ns.root = firstChild;

		const searchNested = (v: protobuf.ReflectionObject) => {
			if (v instanceof protobuf.Type) {
				if (IsNotify(v.name)) ns.notifies.push(v);
				ns.messages.push(v);
			} else if (v instanceof protobuf.Service) {
				ns.methods.push(...v.methodsArray);
			} else if (v instanceof protobuf.Enum) {
				ns.enums.push(v);
			} else {
				console.log("未知类型：" + v.fullName);
			}
		};

		firstChild.nestedArray.forEach(searchNested);
	}

	private buildTSComments(comment: string, indentCount: number) {
		if (!comment) return "";
		const lines = comment.split("\n")
			.map(l => l.trim())
			.filter(l => !!l);

		if (lines.length === 0) return "";

		const tabs = GetIndent(indentCount);
		if (lines.length === 1) return `${ tabs }/** ${ lines[0] } */\n`;

		return `${ tabs }/**\n${ lines.map(l => `${ tabs } ** ${ l }`).join('\n') }\n${ tabs } */\n`;
	}

	private getBaseName(msg: protobuf.Type) {
		if (!(msg.parent instanceof protobuf.Type)) {
			if (IsNotify(msg.name)) return "INotify";
			if (IsRequest(msg.name)) return "IRequest";
			if (IsResponse(msg.name)) return "IResponse";
		}
		return "IProto";
	}

	private getInterfaceName(refObj: protobuf.ReflectionObject) {
		const nsFullName = this.namespace.fullName;
		const fullName = refObj.fullName;

		if (refObj instanceof protobuf.Type) {

			if (fullName.startsWith(nsFullName)) {
				const name = fullName.substring(nsFullName.length + 1);
				return `I${ name.replace(/\./g, ".I") }`;
			}
			return `I${ fullName.replace(/\./g, ".I") }`;
			
		} else if (refObj instanceof protobuf.Enum) {

			let name = fullName;
			if (name.startsWith(nsFullName)) {
				name = fullName.substring(nsFullName.length + 1);
			}
			const names = name.split(".");
			names.pop();
			return names.length > 0 ? names.map(v => v = `I${ v }`).join(".") + "." +refObj.name : refObj.name;
		}
		return refObj.name;
	}

	private getInterfaceNameByTypeName(typeName: string, typeParent?: protobuf.Namespace) {
		const names = typeName.split(".");
		let parent = typeParent || this.namespace.root;
		let type: protobuf.Type;
		while (!type && parent) {
			let tempParent = parent;
			for (let i = 0; i < names.length; i++) {
				const e = names[i];
				type = tempParent.nested?.[e] as protobuf.Type;
				if (!type) break;
				tempParent = type;
			}
			parent = parent.parent;
		}

		if (!type) {
			console.log(`未找到类型定义: ${ typeName } in ${ typeParent ? typeParent.fullName : this.namespace.root.fullName }`);
		}
		return this.getInterfaceName(type);
	}

	private buildTSEnum(v: protobuf.Enum, isSub?: boolean, indent: number = 0) {
		const indentStr = GetIndent(indent);
		const builder: string[] = [];
		const { name, comment, values, comments } = v;
		builder.push(this.buildTSComments(comment, indent));
		builder.push(`${indentStr}${ isSub ? "" : "declare " }const enum ${ name } {\n`);
		for (const [ekey, evalue] of Object.entries(values)) {
			builder.push(`${indentStr}${ this.buildTSComments(comments?.[ekey] || "", indent + 1) }\t${ ekey } = ${ evalue },\n`);
		}
		builder.push(`${indentStr}}\n\n`);
		return builder.join('');
	}

	private buildTSMessage(msg: protobuf.Type, isSub?: boolean, indent: number = 0) {
		const indentStr = GetIndent(indent);
		const builder: string[] = [];
		const comments = `${ msg.fullName }${ msg.comment ? "\n" + msg.comment : "" }`;
		builder.push(this.buildTSComments(comments, indent));

		const baseInterface = this.getBaseName(msg);
		builder.push(`${ indentStr }${ isSub ? "" : "declare " }interface I${ msg.name } extends ${ baseInterface } {\n`);

		if (msg.fields) {
			const isResponse = IsResponse(msg.name);
			const replacer = this.replaces[msg.fullName];
			for (const [key, field] of Object.entries(msg.fields)) {
				// 特殊处理：忽略 Res 里的 Error 冗余定义
				if (isResponse && key === "error" && field.type == "Error") continue;

				builder.push(this.buildTSComments(field.comment, indent + 1));
				const optional = !!(replacer && replacer[key] && replacer[key].optional) ? "?" : "";
				const fieldType = TS_TYPE_MAP[field.type] || this.getInterfaceNameByTypeName(field.type, field.parent);
				const arrayKey = field["rule"] === "repeated" ? "[]" : "";
				builder.push(`${ indentStr }\t${ key }${ optional }: ${ fieldType }${ arrayKey };\n`);
			}
		}

		builder.push(`${ indentStr }}\n\n`);

		if (msg.nestedArray && msg.nestedArray.length > 0) {
			const buildSubMessage = (v: protobuf.ReflectionObject) => {
				if (v instanceof protobuf.Type) {
					builder.push(this.buildTSMessage(v, true, indent + 1));
				} else if (v instanceof protobuf.Service) {
					
				} else if (v instanceof protobuf.Enum) {
					builder.push(this.buildTSEnum(v, true, indent + 1));
				} else {
					console.log("未知类型：" + v.fullName);
				}
			};
			builder.push(`${ indentStr }${ isSub ? "" : "declare " }namespace I${ msg.name } {\n`);
			msg.nestedArray.forEach(buildSubMessage);
			builder[builder.length - 1] = builder[builder.length - 1].trimEnd();
			builder.push(`\n${ indentStr }}\n\n`);
		}
		return builder.join('');
	}

	private buildTS() {
		const { methods, notifies, messages, enums } = this.namespace;
		const builder = {
			notify: [] as string[],
			libNotify: [] as string[],
			req: [] as string[],
			libReq: [] as string[],
			reqMethod: [] as string[],
			message: [] as string[]
		};

		// 1. 处理 Notifies
		notifies.forEach(v => {
			const { name, comment } = v;
			const comments = `${ comment || "" }\nres: {@link I${ name }}`.trim();
			builder.notify.push(`${ this.buildTSComments(comments, 1) }\t${ name } = "${ name }",\n`);
			builder.libNotify.push(`\t${ name }: "${ name }",\n`);
		});

		// 2. 处理 Methods (RPC)
		methods.forEach(v => {
			const { name, comment, requestType, responseType } = v;
			const newReqType = this.getInterfaceNameByTypeName(requestType, v.parent);
			const newResType = this.getInterfaceNameByTypeName(responseType, v.parent);
			const newComment = `\nreq: {@link ${ newReqType }}\nres: {@link ${ newResType }}`;
			builder.req.push(`${ this.buildTSComments((comment || "") + newComment + `\nmethod: {@link IReqMethod.${ name }}`, 1) }\t${ name } = "${ name }",\n`);
			builder.libReq.push(`\t${ name }: "${ name }",\n`);
			builder.reqMethod.push(`${ this.buildTSComments((comment || "") + newComment + `\nmsgId: {@link ENetMessage.${ name }}`, 1) }\t${ name }(data?: ${ newReqType }): Promise<${ newResType }>;\n`);
		});

		//3.处理枚举
		enums.forEach(v => {
			builder.message.push(this.buildTSEnum(v));
		});

		// 4. 处理核心 Message 内容
		builder.message.push('declare type ProtoObject<T> = Omit<T, keyof IProto>;\n\n');
		builder.message.push('declare interface IProto {\n\t$type?: protobuf.Type;\n\ttoJSON?(): ProtoObject<this>;\n}\n\n');
		builder.message.push('declare interface INotify extends IProto {\n\n}\n\n');
		builder.message.push('declare interface IRequest extends IProto {\n\tignoreError?: boolean;\n}\n\n');
		builder.message.push('declare interface IResponse extends IProto {\n\terror?: IError;\n}\n\n');

		messages.forEach(v => {
			builder.message.push(this.buildTSMessage(v));
		});

		// 写文件
		const tip = `${ TS_MODIFY_TIP }\n`;

		fs.writeFileSync(Declare_ProtoPath, tip +
			`/** 网络通知 */\ndeclare enum ENetNotify {\n${ builder.notify.join('') }}\n\n` +
			`/** 网络请求协议 */\ndeclare enum ENetMessage {\n${ builder.req.join('') }}\n\n` +
			builder.message.join('').trimEnd() + "\n"
		);

		fs.writeFileSync(Lib_ProtoPath, tip +
			`ENetNotify = {\n${ builder.libNotify.join('') }}\n\n` +
			`ENetMessage = {\n${ builder.libReq.join('') }}\n`
		);

		fs.writeFileSync(Declare_ReqMethodPath, tip +
			`declare interface IReqMethod {\n${ builder.reqMethod.join('') }}\n`
		);
	}
}
new BuildProtoDeclare().doBuild();