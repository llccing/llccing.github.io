export function buildAtUserMsgBodyItem(userId, senderNickname) {
    return {
        msg_type: 'TIMCustomElem',
        msg_content: {
            data: JSON.stringify({ elem_type: 1002, text: `@${senderNickname ?? ''}`, user_id: userId }),
        },
    };
}
export const customHandler = {
    msgType: 'TIMCustomElem',
    extract(ctx, elem, resData) {
        if (elem.msg_content?.data) {
            try {
                const customContent = JSON.parse(elem.msg_content?.data);
                if (customContent?.elem_type === 1002) {
                    if (!resData.isAtBot) {
                        const { botId } = ctx.account;
                        resData.isAtBot = customContent?.user_id === botId;
                    }
                    ctx.log.info(`@ 消息: text:${customContent?.text}, useId:${customContent?.user_id}, isAtBot:${resData.isAtBot}`);
                    return !resData.isAtBot && customContent.text ? customContent.text : undefined;
                }
            }
            catch { }
        }
        return '[custom]';
    },
    buildMsgBody(data) {
        const customData = typeof data.data === 'string'
            ? data.data
            : JSON.stringify(data.data);
        return [
            {
                msg_type: 'TIMCustomElem',
                msg_content: { data: customData },
            },
        ];
    },
};
//# sourceMappingURL=custom.js.map