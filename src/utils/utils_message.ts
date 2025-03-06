import { AI } from "../AI/AI";
import { Message } from "../AI/context";
import { ConfigManager } from "../config/config";

export function buildSystemMessage(ctx: seal.MsgContext): Message {
    const { roleSettingTemplate, showNumber }: { roleSettingTemplate: string, showNumber: boolean } = ConfigManager.message;

    let [roleSettingIndex, _] = seal.vars.intGet(ctx, "$g人工智能插件专用角色设定序号");
    if (roleSettingIndex < 0 || roleSettingIndex >= roleSettingTemplate.length) {
        roleSettingIndex = 0;
    }

    let content = roleSettingTemplate[roleSettingIndex];

    // 群聊信息
    if (!ctx.isPrivate) {
        content += `
**相关信息**
- 当前群聊:<${ctx.group.groupName}>${showNumber ? `(${ctx.group.groupId.replace(/\D+/g, '')})` : ``}
- <@xxx>表示@某个群成员，xxx为名字${showNumber ? `或者纯数字QQ号` : ``}`;
    } else {
        content += `
**相关信息**
- 当前私聊:<${ctx.player.name}>${showNumber ? `(${ctx.player.userId.replace(/\D+/g, '')})` : ``}`;
    }

    content += `- <|from:xxx${showNumber ? `(yyy)` : ``}|>表示消息来源，xxx为用户名字${showNumber ? `，yyy为纯数字QQ号` : ``}
- <|图片xxxxxx:yyy|>为图片，其中xxxxxx为6位的图片id，yyy为图片描述（可能没有），如果要发送出现过的图片请使用<|图片xxxxxx|>的格式`;

    const systemMessage: Message = {
        role: "system",
        content: content,
        uid: '',
        name: '',
        timestamp: 0
    };

    return systemMessage;
}

export function buildSamplesMessages(ctx: seal.MsgContext) {
    const { samples }: { samples: string[] } = ConfigManager.message;

    const samplesMessages: Message[] = samples
        .map((item, index) => {
            if (item == "") {
                return null;
            } else if (index % 2 === 0) {
                return {
                    role: "user",
                    content: item,
                    uid: '',
                    name: "用户",
                    timestamp: 0,
                    images: []
                };
            } else {
                return {
                    role: "assistant",
                    content: item,
                    uid: ctx.endPoint.userId,
                    name: seal.formatTmpl(ctx, "核心:骰子名字"),
                    timestamp: 0,
                    images: []
                };
            }
        })
        .filter((item) => item !== null);

    return samplesMessages;
}

export function handleMessages(ctx: seal.MsgContext, ai: AI) {
    const { isPrefix, showNumber, isMerge } = ConfigManager.message;

    const systemMessage = buildSystemMessage(ctx);
    const samplesMessages = buildSamplesMessages(ctx);

    const messages = [systemMessage, ...samplesMessages, ...ai.context.messages];

    // 处理前缀并合并消息（如果有）
    let processedMessages = [];
    let last_role = '';
    for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        const prefix = isPrefix && message.name ? (
            message.name.startsWith('_') ?
                `<|${message.name}|>` :
                `<|from:${message.name}${showNumber ? `(${message.uid.replace(/\D+/g, '')})` : ``}|>`
        ) : '';

        if (isMerge && message.role === last_role && message.role !== 'tool') {
            processedMessages[processedMessages.length - 1].content += '\n' + prefix + message.content;
        } else {
            processedMessages.push({
                role: message.role,
                content: prefix + message.content
            });
            last_role = message.role;
        }
    }

    return processedMessages;
}