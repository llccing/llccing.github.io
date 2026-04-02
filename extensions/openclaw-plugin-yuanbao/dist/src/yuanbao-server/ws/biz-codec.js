import protobuf from 'protobufjs';
import bizDescriptor from './proto/biz.json' with { type: 'json' };
import { LOG_PREFIX } from '../../logger.js';
let root = null;
function getRoot() {
    if (!root) {
        root = protobuf.Root.fromJSON(bizDescriptor);
    }
    return root;
}
const PKG = 'trpc.yuanbao.yuanbao_conn.yuanbao_openclaw_proxy';
export const BIZ_MSG_TYPES = {
    MsgContent: `${PKG}.MsgContent`,
    MsgBodyElement: `${PKG}.MsgBodyElement`,
    InboundMessagePush: `${PKG}.InboundMessagePush`,
    SendC2CMessageReq: `${PKG}.SendC2CMessageReq`,
    SendGroupMessageReq: `${PKG}.SendGroupMessageReq`,
    SendC2CMessageRsp: `${PKG}.SendC2CMessageRsp`,
    SendGroupMessageRsp: `${PKG}.SendGroupMessageRsp`,
};
export function encodeBizPB(key, value) {
    try {
        const type = getRoot().lookupType(key);
        const message = type.create(value);
        return type.encode(message).finish();
    }
    catch (error) {
        console.error(`${LOG_PREFIX}[biz-codec]p[] 编码失败: key=${key}, error=${error.message}`);
        return null;
    }
}
export function decodeBizPB(key, data) {
    try {
        const type = getRoot().lookupType(key);
        return type.decode(data instanceof Uint8Array ? data : new Uint8Array(data));
    }
    catch {
        return null;
    }
}
export function toProtoMsgBody(elements) {
    return elements.map((el) => {
        const c = el.msg_content;
        return {
            msgType: el.msg_type,
            msgContent: {
                text: c.text,
                uuid: c.uuid,
                imageFormat: c.image_format,
                data: c.data,
                desc: c.desc,
                ext: c.ext,
                sound: c.sound,
                imageInfoArray: c.image_info_array,
                index: c.index,
                url: c.url,
                fileSize: c.file_size,
                fileName: c.file_name,
            },
        };
    });
}
export function fromProtoMsgBody(elements) {
    if (!elements || !Array.isArray(elements))
        return [];
    return elements.map((el) => {
        const mc = el.msgContent;
        const content = {};
        if (mc?.text)
            content.text = mc.text;
        if (mc?.uuid)
            content.uuid = mc.uuid;
        if (mc?.imageFormat)
            content.image_format = mc.imageFormat;
        if (mc?.data)
            content.data = mc.data;
        if (mc?.desc)
            content.desc = mc.desc;
        if (mc?.ext)
            content.ext = mc.ext;
        if (mc?.sound)
            content.sound = mc.sound;
        if (mc?.imageInfoArray && mc.imageInfoArray.length > 0)
            content.image_info_array = mc.imageInfoArray;
        if (mc?.index)
            content.index = mc.index;
        if (mc?.url)
            content.url = mc.url;
        if (mc?.fileSize)
            content.file_size = mc.fileSize;
        if (mc?.fileName)
            content.file_name = mc.fileName;
        return {
            msg_type: el.msgType || '',
            msg_content: content,
        };
    });
}
export function encodeSendC2CMessageReq(data) {
    return encodeBizPB(BIZ_MSG_TYPES.SendC2CMessageReq, {
        msgId: data.msg_id ?? '',
        toAccount: data.to_account,
        fromAccount: data.from_account ?? '',
        msgRandom: data.msg_random ?? 0,
        msgBody: toProtoMsgBody(data.msg_body),
    });
}
export function encodeSendGroupMessageReq(data) {
    return encodeBizPB(BIZ_MSG_TYPES.SendGroupMessageReq, {
        msgId: data.msg_id ?? '',
        groupId: data.group_id,
        fromAccount: data.from_account ?? '',
        toAccount: data.to_account ?? '',
        random: data.random ?? '',
        msgBody: toProtoMsgBody(data.msg_body),
        refMsgId: data.ref_msg_id ?? '',
    });
}
export function decodeInboundMessage(data) {
    const decoded = decodeBizPB(BIZ_MSG_TYPES.InboundMessagePush, data);
    if (!decoded)
        return null;
    return {
        callback_command: decoded.callbackCommand || undefined,
        from_account: decoded.fromAccount || undefined,
        to_account: decoded.toAccount || undefined,
        sender_nickname: decoded.senderNickname || undefined,
        group_id: decoded.groupId || undefined,
        group_code: decoded.groupCode || undefined,
        group_name: decoded.groupName || undefined,
        msg_seq: decoded.msgSeq || undefined,
        msg_random: decoded.msgRandom || undefined,
        msg_time: decoded.msgTime || undefined,
        msg_key: decoded.msgKey || undefined,
        msg_id: decoded.msgId || undefined,
        msg_body: decoded.msgBody ? fromProtoMsgBody(decoded.msgBody) : undefined,
        cloud_custom_data: decoded.cloudCustomData || undefined,
        event_time: decoded.eventTime || undefined,
        bot_owner_id: decoded.botOwnerId || undefined,
    };
}
export function decodeSendC2CMessageRsp(data, msgId) {
    const decoded = decodeBizPB(BIZ_MSG_TYPES.SendC2CMessageRsp, data);
    if (!decoded)
        return null;
    return {
        msgId,
        code: decoded.code || 0,
        message: decoded.message || '',
    };
}
export function decodeSendGroupMessageRsp(data, msgId) {
    const decoded = decodeBizPB(BIZ_MSG_TYPES.SendGroupMessageRsp, data);
    if (!decoded)
        return null;
    return {
        msgId,
        code: decoded.code || 0,
        message: decoded.message || '',
    };
}
export function decodeSendMessageRsp(data, msgId) {
    return decodeSendC2CMessageRsp(data, msgId) ?? decodeSendGroupMessageRsp(data, msgId);
}
//# sourceMappingURL=biz-codec.js.map