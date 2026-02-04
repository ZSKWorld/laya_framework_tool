import { resolve } from "path";

export const __workname = process.cwd();

//---------------------------------------------Laya 2.0
export const BinDir = resolve(__workname, "bin");
export const ResDir = resolve(__workname, "bin/res");
export const Lang = ["chs", "chs_t", "en", "jp", "ke"];
export const LangResDir = resolve(__workname, "bin/langRes");
export const UiDir = resolve(__workname, "src/core/ui/ui");
export const ViewDir = resolve(__workname, "src/core/ui/view");
export const ResPathPath = resolve(__workname, "src/core/common/ResPath.ts");
export const Declare_ResPathPath = resolve(__workname, "libs_game/res_path.d.ts");
export const Lib_ResPathPath = resolve(__workname, "bin/libs_leb/respath.d.js");
export const ResPathPathNoExt = resolve(__workname, "src/core/common/ResPath");
export const ViewIDPath = resolve(__workname, "src/core/ui/core/ViewID.ts");
export const Declare_ViewIDPath = resolve(__workname, "libs_game/view_id.d.ts");
export const Lib_ViewIDPath = resolve(__workname, "bin/libs_leb/viewid.d.js");
export const MediatorBasePath = resolve(__workname, "src/core/mvc/view/MediatorBase.ts");
export const InitViewCommandPath = resolve(__workname, "src/contextCommand/InitViewCommand.ts");
export const xlsxDir = resolve(__workname, "../excel");
export const CfgDataPath = resolve(__workname, "bin/res/config/Config.json");
export const CfgDir = resolve(__workname, "src/core/config");
export const ShaderDir = resolve(__workname, "src/core/shader");

export const NetDir = resolve(__workname, "src/core/net");
export const CMDInterfaceDir = resolve(NetDir, "interface/cmd");
export const NotifyInterfaceDir = resolve(NetDir, "interface/notify");
export const NetServicePath = resolve(NetDir, "NetService.ts");
export const Declare_NetServicePath = resolve(NetDir, "INetService.d.ts");
export const ServiceObjPath = resolve(NetDir, "ServiceObj.ts");
export const Declare_MessageIDPath = resolve(__workname, "libs_game/message_id.d.ts");
export const Lib_MessageIDPath = resolve(__workname, "bin/libs_leb/messageid.d.js");
export const NetNotifyPath = resolve(NetDir, "enum/NetNotify.ts");
export const UserDataDir = resolve(__workname, "src/core/userData");
export const UserDataInterfaceDir = resolve(UserDataDir, "interface");
export const UserDataEventPath = resolve(UserDataDir, "UserDataEvent.ts");
export const Lib_UserDataEventPath = resolve(__workname, "bin/libs_game/userdataevent.js");
export const Declare_UserDataEventPath = resolve(__workname, "libs_game/user_data_event.d.ts");

//---------------------------------------------Server
export const Server_NotifyInterfaceDir = resolve(__workname, "src/core/controller/interface/notify");
export const Server_NetNotifyPath = resolve(__workname, "src/core/enum/NetNotify.ts");


//---------------------------------------------Laya 3.0
export const ResDir3_0 = resolve(__workname, "assets/resources");
export const Declare_ResPathPath3_0 = resolve(__workname, "engine/libs_game/res_path.d.ts");
export const ResPathPath3_0 = resolve(__workname, "src/core/common/ResPath.ts");

//---------------------------------------------Proto & excel Declare
export const ExcelDir = resolve(__workname, "bin/excel");
export const Declare_ExcelDir = resolve(__workname, "src/core/config/declare");
export const Declare_CfgMgrPath = resolve(__workname, "src/core/config/IConfigManager.d.ts");
export const ProtoPath = resolve(__workname, "bin/proto/client.proto");
export const ProtoReplacePath = resolve(__workname, "bin/proto/proto_replace.jsonc");
export const Declare_ProtoPath = resolve(__workname, "libs_game/proto.d.ts");
export const Lib_ProtoPath = resolve(__workname, "bin/libs_leb/proto.d.js");
export const Declare_ReqMethodPath = resolve(__workname, "src/core/net/IReqMethod.d.ts");


//---------------------------------------------Tips
const TipString = "This script is generated automatically, Please do not any modify!";
export const TS_MODIFY_TIP = `/** ${ TipString } */\n`;
export const LUA_MODIFY_TIP = `---${ TipString }\n`;


//---------------------------------------------leb enums
export const LebEnumsSources = [
    resolve(__workname, "libs_game/leb_enums.d.ts"),
    resolve(__workname, "src/core/userData/Interface.d.ts/Interface.d.ts"),
];
export const LebEnumsOutput = resolve(__workname, "bin/libs_leb/leb_enums.d.js");
