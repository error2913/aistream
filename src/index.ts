import { AIManager } from "./AI/AI";
import { ConfigManager } from "./config/config";
import { log } from "./utils/utils";
import { getCQTypes } from "./utils/utils_string";
import { buildSystemMessage } from "./utils/utils_message";

function main() {
  let ext = seal.ext.find('aistream');
  if (!ext) {
    ext = seal.ext.new('aistream', 'baiyu&错误', '1.0.0');
    seal.ext.register(ext);
  }

  ConfigManager.ext = ext;
  ConfigManager.registerConfig();

  const CQTypesAllow = ["at", "image", "reply", "face"];

  const cmdAI = seal.ext.newCmdItemInfo();
  cmdAI.name = 'aistr'; // 指令名字，可用中文
  cmdAI.help = `帮助:
【.aistr st】修改权限(仅骰主可用)
【.aistr ck】检查权限(仅骰主可用)
【.aistr prompt】检查当前prompt(仅骰主可用)
【.aistr pr】查看当前群聊权限
【.aistr ctxn】查看上下文里的名字
【.aistr on】开启AI
【.aistr sb】开启待机模式，此时AI将记忆聊天内容
【.aistr off】关闭AI，此时仍能用关键词触发
【.aistr fgt】遗忘上下文`;
  cmdAI.allowDelegate = true;
  cmdAI.solve = (ctx, msg, cmdArgs) => {
    const val = cmdArgs.getArgN(1);
    const uid = ctx.player.userId;
    const gid = ctx.group.groupId;
    const id = ctx.isPrivate ? uid : gid;

    const ret = seal.ext.newCmdExecuteResult(true);
    const ai = AIManager.getAI(id);

    switch (val) {
      case 'st': {
        if (ctx.privilegeLevel < 100) {
          seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "核心:提示_无权限"));
          return ret;
        }

        const val2 = cmdArgs.getArgN(2);
        if (!val2 || val2 == 'help') {
          const s = `帮助:
【.ai st <ID> <权限限制>】

<ID>:
【QQ:1234567890】 私聊窗口
【QQ-Group:1234】 群聊窗口
【now】当前窗口

<权限限制>:
【0】普通用户
【40】邀请者
【50】群管理员
【60】群主
【100】骰主
不填写时默认为0`;

          seal.replyToSender(ctx, msg, s);
          return ret;
        }

        const limit = parseInt(cmdArgs.getArgN(3));
        if (isNaN(limit)) {
          seal.replyToSender(ctx, msg, '权限值必须为数字');
          return ret;
        }

        const id2 = val2 === 'now' ? id : val2;
        const ai2 = AIManager.getAI(id2);

        ai2.privilege.limit = limit;

        seal.replyToSender(ctx, msg, '权限修改完成');
        AIManager.saveAI(id2);
        return ret;
      }
      case 'ck': {
        if (ctx.privilegeLevel < 100) {
          seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "核心:提示_无权限"));
          return ret;
        }

        const val2 = cmdArgs.getArgN(2);
        if (!val2 || val2 == 'help') {
          const s = `帮助:
【.ai ck <ID>】

<ID>:
【QQ:1234567890】 私聊窗口
【QQ-Group:1234】 群聊窗口
【now】当前窗口`;

          seal.replyToSender(ctx, msg, s);
          return ret;
        }

        const id2 = val2 === 'now' ? id : val2;
        const ai2 = AIManager.getAI(id2);

        const pr = ai2.privilege;

        const counter = pr.counter > -1 ? `${pr.counter}条` : '关闭';
        const timer = pr.timer > -1 ? `${pr.timer}秒` : '关闭';
        const prob = pr.prob > -1 ? `${pr.prob}%` : '关闭';
        const standby = pr.standby ? '开启' : '关闭';
        const s = `${id2}\n权限限制:${pr.limit}\n计数器模式(c):${counter}\n计时器模式(t):${timer}\n概率模式(p):${prob}\n待机模式:${standby}`;
        seal.replyToSender(ctx, msg, s);
        return ret;
      }
      case 'prompt': {
        if (ctx.privilegeLevel < 100) {
          seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "核心:提示_无权限"));
          return ret;
        }

        const systemMessage = buildSystemMessage(ctx);

        seal.replyToSender(ctx, msg, systemMessage.content);
        return ret;
      }
      case 'pr': {
        const pr = ai.privilege;
        if (ctx.privilegeLevel < pr.limit) {
          seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "核心:提示_无权限"));
          return ret;
        }

        const counter = pr.counter > -1 ? `${pr.counter}条` : '关闭';
        const timer = pr.timer > -1 ? `${pr.timer}秒` : '关闭';
        const prob = pr.prob > -1 ? `${pr.prob}%` : '关闭';
        const standby = pr.standby ? '开启' : '关闭';
        const s = `${id}\n权限限制:${pr.limit}\n计数器模式(c):${counter}\n计时器模式(t):${timer}\n概率模式(p):${prob}\n待机模式:${standby}`;
        seal.replyToSender(ctx, msg, s);
        return ret;
      }
      case 'ctxn': {
        const pr = ai.privilege;
        if (ctx.privilegeLevel < pr.limit) {
          seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "核心:提示_无权限"));
          return ret;
        }

        const names = ai.context.getNames();
        const s = `上下文里的名字有：\n<${names.join('>\n<')}>`;
        seal.replyToSender(ctx, msg, s);
        return ret;
      }
      case 'on': {
        const pr = ai.privilege;
        if (ctx.privilegeLevel < pr.limit) {
          seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "核心:提示_无权限"));
          return ret;
        }

        const kwargs = cmdArgs.kwargs;
        if (kwargs.length == 0) {
          const s = `帮助:
【.ai on --<参数>=<数字>】

<参数>:
【c】计数器模式，接收消息数达到后触发。
单位/条，默认10条
【t】计时器模式，最后一条消息后达到时限触发
单位/秒，默认60秒
【p】概率模式，每条消息按概率触发
单位/%，默认10%

【.ai on --t --p=42】使用示例`

          seal.replyToSender(ctx, msg, s);
          return ret;
        }

        let text = `AI已开启：`
        kwargs.forEach(kwarg => {
          const name = kwarg.name;
          const exist = kwarg.valueExists;
          const value = parseFloat(kwarg.value);

          switch (name) {
            case 'c':
            case 'counter': {
              pr.counter = exist && !isNaN(value) ? value : 10;
              text += `\n计数器模式:${pr.counter}条`;
              break;
            }
            case 't':
            case 'timer': {
              pr.timer = exist && !isNaN(value) ? value : 60;
              text += `\n计时器模式:${pr.timer}秒`;
              break;
            }
            case 'p':
            case 'prob': {
              pr.prob = exist && !isNaN(value) ? value : 10;
              text += `\n概率模式:${pr.prob}%`;
              break;
            }
          }
        });

        pr.standby = true;

        seal.replyToSender(ctx, msg, text);
        AIManager.saveAI(id);
        return ret;
      }
      case 'sb': {
        const pr = ai.privilege;
        if (ctx.privilegeLevel < pr.limit) {
          seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "核心:提示_无权限"));
          return ret;
        }

        pr.counter = -1;
        pr.timer = -1;
        pr.prob = -1;
        pr.standby = true;

        ai.clearData();

        seal.replyToSender(ctx, msg, 'AI已开启待机模式');
        AIManager.saveAI(id);
        return ret;
      }
      case 'off': {
        const pr = ai.privilege;
        if (ctx.privilegeLevel < pr.limit) {
          seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "核心:提示_无权限"));
          return ret;
        }

        const kwargs = cmdArgs.kwargs;
        if (kwargs.length == 0) {
          pr.counter = -1;
          pr.timer = -1;
          pr.prob = -1;
          pr.standby = false;

          ai.clearData();

          seal.replyToSender(ctx, msg, 'AI已关闭');
          AIManager.saveAI(id);
          return ret;
        }

        let text = `AI已关闭：`
        kwargs.forEach(kwarg => {
          const name = kwarg.name;

          switch (name) {
            case 'c':
            case 'counter': {
              pr.counter = -1;
              text += `\n计数器模式`
              break;
            }
            case 't':
            case 'timer': {
              pr.timer = -1;
              text += `\n计时器模式`
              break;
            }
            case 'p':
            case 'prob': {
              pr.prob = -1;
              text += `\n概率模式`
              break;
            }
          }
        });

        ai.clearData();

        seal.replyToSender(ctx, msg, text);
        AIManager.saveAI(id);
        return ret;
      }
      case 'f':
      case 'fgt': {
        const pr = ai.privilege;
        if (ctx.privilegeLevel < pr.limit) {
          seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "核心:提示_无权限"));
          return ret;
        }

        ai.clearData();

        const val2 = cmdArgs.getArgN(2);
        const messages = ai.context.messages;

        switch (val2) {
          case 'ass':
          case 'assistant': {
            ai.context.messages = messages.filter(item => item.role !== 'assistant');
            seal.replyToSender(ctx, msg, 'ai上下文已清除');
            AIManager.saveAI(id);
            return ret;
          }
          case 'user': {
            ai.context.messages = messages.filter(item => item.role !== 'user');
            seal.replyToSender(ctx, msg, '用户上下文已清除');
            AIManager.saveAI(id);
            return ret;
          }
          default: {
            ai.context.messages = []
            seal.replyToSender(ctx, msg, '上下文已清除');
            AIManager.saveAI(id);
            return ret;
          }
        }
      }
      case 'help':
      default: {
        ret.showHelp = true;
        return ret;
      }
    }
  }

  // 将命令注册到扩展中
  ext.cmdMap['aistr'] = cmdAI;

  //接受非指令消息
  ext.onNotCommandReceived = async (ctx, msg) => {
    const { disabledInPrivate, keyWords, condition } = ConfigManager.received;
    if (ctx.isPrivate && disabledInPrivate) {
      return;
    }

    const userId = ctx.player.userId;
    const groupId = ctx.group.groupId;
    const id = ctx.isPrivate ? userId : groupId;

    let message = msg.message;
    const ai = AIManager.getAI(id);

    // 检查CQ码
    const CQTypes = getCQTypes(message);
    if (CQTypes.length === 0 || CQTypes.every(item => CQTypesAllow.includes(item))) {
      // 非指令触发图片偷取，以及图片转文字
      if (CQTypes.includes('image')) {
        message = message.replace(/\[CQ:image,file=.*?\]/g, '[图片]');
      }

      clearTimeout(ai.context.timer);
      ai.context.timer = null;

      // 非指令触发
      for (const keyword of keyWords) {
        try {
          const pattern = new RegExp(keyword);
          if (!pattern.test(message)) {
            continue;
          }
        } catch (error) {
          console.error('Error in RegExp:', error);
          continue;
        }

        const fmtCondition = parseInt(seal.format(ctx, `{${condition}}`));
        if (fmtCondition === 1) {
          await ai.context.iteration(ctx, message, 'user');

          log('非指令触发回复');
          await ai.chat(ctx, msg);
          AIManager.saveAI(id);
          return;
        }
      }

      // 开启任一模式时
      const pr = ai.privilege;
      if (pr.standby) {
        await ai.context.iteration(ctx, message, 'user');
      }

      if (pr.counter > -1) {
        ai.context.counter += 1;

        if (ai.context.counter >= pr.counter) {
          log('计数器触发回复');
          ai.context.counter = 0;

          await ai.chat(ctx, msg);
          AIManager.saveAI(id);
          return;
        }
      }

      if (pr.prob > -1) {
        const ran = Math.random() * 100;

        if (ran <= pr.prob) {
          log('概率触发回复');

          await ai.chat(ctx, msg);
          AIManager.saveAI(id);
          return;
        }
      }

      if (pr.timer > -1) {
        ai.context.timer = setTimeout(async () => {
          log('计时器触发回复');

          ai.context.timer = null;
          await ai.chat(ctx, msg);
          AIManager.saveAI(id);
        }, pr.timer * 1000 + Math.floor(Math.random() * 500));
      }
    }
  }

  //接受的指令
  ext.onCommandReceived = async (ctx, msg, _) => {
    const { allcmd } = ConfigManager.received;
    if (allcmd) {
      const uid = ctx.player.userId;
      const gid = ctx.group.groupId;
      const id = ctx.isPrivate ? uid : gid;

      const ai = AIManager.getAI(id);

      let message = msg.message;

      const CQTypes = getCQTypes(message);
      if (CQTypes.length === 0 || CQTypes.every(item => CQTypesAllow.includes(item))) {
        const pr = ai.privilege;
        if (pr.standby) {
          message = message.replace(/\[CQ:image,file=.*?\]/g, '[图片]');
          await ai.context.iteration(ctx, message, 'user');
        }
      }
    }
  }

  //骰子发送的消息
  ext.onMessageSend = async (ctx, msg) => {
    const uid = ctx.player.userId;
    const gid = ctx.group.groupId;
    const id = ctx.isPrivate ? uid : gid;

    const ai = AIManager.getAI(id);

    let message = msg.message;

    const { allmsg } = ConfigManager.received;
    if (allmsg) {
      const CQTypes = getCQTypes(message);
      if (CQTypes.length === 0 || CQTypes.every(item => CQTypesAllow.includes(item))) {
        const pr = ai.privilege;
        if (pr.standby) {
          message = message.replace(/\[CQ:image,file=.*?\]/g, '[图片]');
          await ai.context.iteration(ctx, message, 'assistant');
          return;
        }
      }
    }
  }
}

main();
