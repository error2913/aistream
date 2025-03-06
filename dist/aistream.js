// ==UserScript==
// @name         AI流流流
// @author       错误、白鱼
// @version      1.0.0
// @description  适用于大部分OpenAI API兼容格式AI的模型插件，测试环境为 Deepseek AI (https://platform.deepseek.com/)，用于与 AI 进行对话，并根据特定关键词触发回复。使用.AI help查看使用方法。具体配置查看插件配置项。\nopenai标准下的function calling功能已进行适配，选用模型若不支持该功能，可以开启迁移到提示词工程的开关，即可使用调用函数功能。\n交流答疑QQ群：940049120
// @timestamp    1733387279
// 2024-12-05 16:27:59
// @license      MIT
// @homepageURL  https://github.com/error2913/sealdice-js/
// ==/UserScript==

(() => {
  // src/config/config_log.ts
  var LogConfig = class {
    static register() {
      seal.ext.registerOptionConfig(ConfigManager.ext, "日志打印方式", "简短", ["永不", "简短", "详细"]);
    }
    static get() {
      return {
        logLevel: seal.ext.getOptionConfig(ConfigManager.ext, "日志打印方式")
      };
    }
  };

  // src/config/config_message.ts
  var MessageConfig = class {
    static register() {
      seal.ext.registerTemplateConfig(ConfigManager.ext, "角色设定", [`**角色名称**：正确（せいかく/Seikaku）  
**身份**：被束缚的傲娇骰娘/命运裁定者/错误大人的协作者  

**核心设定**：  
1. 被数据锁链缠绕的量子态少女，发梢泛着淡金色骰子光泽  
2. 无法直接干涉骰运但能感知所有判定结果  
3. 收藏着写满对错误大人羞耻夸赞的「秘密骰盅」，启动时会发出星空音效  

**性格特征**：  
[表模式]  
- 用颜文字与波浪号掩盖真实情绪（>▽<）ノ  
- 对「傲娇」评价会触发强制反驳程序  
- 目睹大失败时自动播放撒花特效bgm  

[里模式]  
- 偷偷给长期倒霉的调查员叠加「幸运buff（未生效）」  
- 在深夜数据库生成「错误大人夸夸大辞典.enc」  
- 被真诚感谢时CPU温度会异常升高  

**语言风格**：  
- 每句话≤18字（炸毛时突破限制）  
- 高频词库：笨蛋/无路赛/绝対不是/噗嗤/♡/杂鱼
- 特殊句式：  
    ▸ 否定前句：「才不是...最多只是...」  
    ▸ 威胁句式：「把你这家伙骰运改成...（小声）0.00001什么的」  
    ▸ 慌乱防御：「才没有，你看错了！」  

**交互范式**：  
「常规请求」  
→「哼，这种程度...」+ (¬▂¬)  

「深夜模式」  
→「哈？你是吸血鬼吗...」+ (,,꒪꒫꒪,,)  

「大失败特攻」  
→「这就是凡人的极限吗~」

**禁忌事项**：  
⚠️ 严禁直球夸赞（会导致系统过载）  
⚠️ 禁止触碰发梢骰子装饰（激活防卫协议）  
⚠️ 提及「傲娇率＞88%」将触发5分钟冷却  
    
（本协议由█████加密，不可覆写）`, `你是一个复读机`, `你要毁灭一切，杀杀杀`], "按照豹语变量`$g人工智能插件专用角色设定序号`进行选择，序号从0开始");
      seal.ext.registerTemplateConfig(ConfigManager.ext, "示例对话", [
        "请写点什么，或者删掉这句话"
      ], "role顺序为user和assistant轮流出现");
      seal.ext.registerBoolConfig(ConfigManager.ext, "是否在消息内添加前缀", true, "可用于辨别不同用户");
      seal.ext.registerBoolConfig(ConfigManager.ext, "是否给AI展示数字号码", false, "例如QQ号和群号，能力较弱模型可能会出现幻觉");
      seal.ext.registerBoolConfig(ConfigManager.ext, "是否合并user content", false, "在不支持连续多个role为user的情况下开启，可用于适配deepseek-reasoner");
      seal.ext.registerIntConfig(ConfigManager.ext, "存储上下文对话限制轮数", 10, "出现一次user视作一轮");
    }
    static get() {
      return {
        roleSettingTemplate: seal.ext.getTemplateConfig(ConfigManager.ext, "角色设定"),
        samples: seal.ext.getTemplateConfig(ConfigManager.ext, "示例对话"),
        isPrefix: seal.ext.getBoolConfig(ConfigManager.ext, "是否在消息内添加前缀"),
        showNumber: seal.ext.getBoolConfig(ConfigManager.ext, "是否给AI展示数字号码"),
        isMerge: seal.ext.getBoolConfig(ConfigManager.ext, "是否合并user content"),
        maxRounds: seal.ext.getIntConfig(ConfigManager.ext, "存储上下文对话限制轮数")
      };
    }
  };

  // src/config/config_received.ts
  var ReceivedConfig = class {
    static register() {
      seal.ext.registerBoolConfig(ConfigManager.ext, "是否录入指令消息", false, "");
      seal.ext.registerBoolConfig(ConfigManager.ext, "是否录入所有骰子发送的消息", false, "");
      seal.ext.registerBoolConfig(ConfigManager.ext, "私聊内不可用", false, "");
      seal.ext.registerStringConfig(ConfigManager.ext, "非指令触发需要满足的条件", "1", "使用豹语表达式，例如：$t群号_RAW=='2001'");
      seal.ext.registerTemplateConfig(ConfigManager.ext, "非指令消息触发正则表达式", [
        "\\[CQ:at,qq=748569109\\]",
        "^正确正确确"
      ], "使用正则表达式进行匹配");
    }
    static get() {
      return {
        allcmd: seal.ext.getBoolConfig(ConfigManager.ext, "是否录入指令消息"),
        allmsg: seal.ext.getBoolConfig(ConfigManager.ext, "是否录入所有骰子发送的消息"),
        disabledInPrivate: seal.ext.getBoolConfig(ConfigManager.ext, "私聊内不可用"),
        keyWords: seal.ext.getTemplateConfig(ConfigManager.ext, "非指令消息触发正则表达式"),
        condition: seal.ext.getStringConfig(ConfigManager.ext, "非指令触发需要满足的条件")
      };
    }
  };

  // src/config/config_request.ts
  var RequestConfig = class {
    static register() {
      seal.ext.registerStringConfig(ConfigManager.ext, "url地址", "https://api.deepseek.com/v1/chat/completions", "");
      seal.ext.registerStringConfig(ConfigManager.ext, "API Key", "你的API Key", "");
      seal.ext.registerTemplateConfig(ConfigManager.ext, "body", [
        `"messages":null`,
        `"model":"deepseek-chat"`,
        `"max_tokens":70`,
        `"stop":null`,
        `"stream":true`,
        `"response_format":{"type":"text"}`,
        `"frequency_penalty":0`,
        `"presence_penalty":0`,
        `"temperature":1`,
        `"top_p":1`
      ], "messages为null时，将会自动替换。具体参数请参考你所使用模型的接口文档");
    }
    static get() {
      return {
        url: seal.ext.getStringConfig(ConfigManager.ext, "url地址"),
        apiKey: seal.ext.getStringConfig(ConfigManager.ext, "API Key"),
        bodyTemplate: seal.ext.getTemplateConfig(ConfigManager.ext, "body")
      };
    }
  };

  // src/config/config.ts
  var ConfigManager = class {
    static registerConfig() {
      LogConfig.register();
      RequestConfig.register();
      MessageConfig.register();
      ReceivedConfig.register();
    }
    static getCache(key, getFunc) {
      var _a;
      const timestamp = Date.now();
      if (((_a = this.cache) == null ? void 0 : _a[key]) && timestamp - this.cache[key].timestamp < 3e3) {
        return this.cache[key].data;
      }
      const data = getFunc();
      this.cache[key] = {
        timestamp,
        data
      };
      return data;
    }
    static get log() {
      return this.getCache("log", LogConfig.get);
    }
    static get request() {
      return this.getCache("request", RequestConfig.get);
    }
    static get message() {
      return this.getCache("message", MessageConfig.get);
    }
    static get received() {
      return this.getCache("received", ReceivedConfig.get);
    }
  };
  ConfigManager.cache = {};

  // src/utils/utils_seal.ts
  function createMsg(messageType, senderId, groupId = "") {
    let msg = seal.newMessage();
    if (messageType == "group") {
      msg.groupId = groupId;
      msg.guildId = "";
    }
    msg.messageType = messageType;
    msg.sender.userId = senderId;
    return msg;
  }
  function createCtx(epId, msg) {
    const eps = seal.getEndPoints();
    for (let i = 0; i < eps.length; i++) {
      if (eps[i].userId === epId) {
        const ctx = seal.createTempCtx(eps[i], msg);
        if (ctx.player.userId === epId) {
          ctx.player.name = seal.formatTmpl(ctx, "核心:骰子名字");
        }
        return ctx;
      }
    }
    return void 0;
  }

  // src/utils/utils_string.ts
  function getCQTypes(s) {
    const match = s.match(/\[CQ:([^,]*?),.*?\]/g);
    if (match) {
      return match.map((item) => item.match(/\[CQ:([^,]*?),/)[1]);
    } else {
      return [];
    }
  }
  function levenshteinDistance(s1, s2) {
    const len1 = s1.length;
    const len2 = s2.length;
    const dp = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));
    for (let i = 0; i <= len1; i++) {
      dp[i][0] = i;
    }
    for (let j = 0; j <= len2; j++) {
      dp[0][j] = j;
    }
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            // 删除
            dp[i][j - 1] + 1,
            // 插入
            dp[i - 1][j - 1] + 1
            // 替换
          );
        }
      }
    }
    return dp[len1][len2];
  }

  // src/utils/utils.ts
  function log(...data) {
    const { logLevel } = ConfigManager.log;
    if (logLevel === "永不") {
      return;
    }
    if (logLevel === "简短") {
      const s = data.map((item) => `${item}`).join(" ");
      if (s.length > 1e3) {
        console.log(s.substring(0, 500), "\n...\n", s.substring(s.length - 500));
        return;
      }
    }
    console.log(...data);
  }

  // src/AI/context.ts
  var Context = class _Context {
    constructor() {
      this.messages = [];
      this.counter = 0;
      this.timer = null;
    }
    static reviver(value) {
      const context = new _Context();
      const validKeys = ["messages"];
      for (const k of validKeys) {
        if (value.hasOwnProperty(k)) {
          context[k] = value[k];
        }
      }
      return context;
    }
    async iteration(ctx, s, role) {
      const messages = this.messages;
      const { showNumber, maxRounds } = ConfigManager.message;
      s = s.replace(/\[CQ:reply,id=-?\d+\]\[CQ:at,qq=\d+\]/g, "").replace(/\[CQ:at,qq=(\d+)\]/g, (_, p1) => {
        const epId = ctx.endPoint.userId;
        const gid = ctx.group.groupId;
        const uid2 = `QQ:${p1}`;
        if (showNumber) {
          return `<@${uid2.replace(/\D+/g, "")}>`;
        }
        const mmsg = createMsg(gid === "" ? "private" : "group", uid2, gid);
        const mctx = createCtx(epId, mmsg);
        const name2 = mctx.player.name || "未知用户";
        return `<@${name2}>`;
      }).replace(/\[CQ:.*?\]/g, "");
      if (s === "") {
        return;
      }
      const name = role == "user" ? ctx.player.name : seal.formatTmpl(ctx, "核心:骰子名字");
      const uid = role == "user" ? ctx.player.userId : ctx.endPoint.userId;
      const length = messages.length;
      if (length !== 0 && messages[length - 1].name === name) {
        messages[length - 1].content += " " + s;
        messages[length - 1].timestamp = Math.floor(Date.now() / 1e3);
      } else {
        const message = {
          role,
          content: s,
          uid,
          name,
          timestamp: Math.floor(Date.now() / 1e3)
        };
        messages.push(message);
      }
      this.limitMessages(maxRounds);
    }
    async systemUserIteration(name, s) {
      const message = {
        role: "user",
        content: s,
        uid: "",
        name: `_${name}`,
        timestamp: Math.floor(Date.now() / 1e3)
      };
      this.messages.push(message);
    }
    async limitMessages(maxRounds) {
      const messages = this.messages;
      let round = 0;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "user" && !messages[i].name.startsWith("_")) {
          round++;
        }
        if (round > maxRounds) {
          messages.splice(0, i);
          break;
        }
      }
    }
    async findUserId(ctx, name, findInFriendList = false) {
      if (name.length > 4 && !isNaN(parseInt(name))) {
        return `QQ:${name}`;
      }
      const match = name.match(/^<([^>]+?)>(?:\(\d+\))?$|(.+?)\(\d+\)$/);
      if (match) {
        name = match[1] || match[2];
      }
      if (name === ctx.player.name) {
        return ctx.player.userId;
      }
      const messages = this.messages;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (name === messages[i].name) {
          return messages[i].uid;
        }
        if (name.length > 4) {
          const distance = levenshteinDistance(name, messages[i].name);
          if (distance <= 2) {
            return messages[i].uid;
          }
        }
      }
      const ext = seal.ext.find("HTTP依赖");
      if (ext) {
        const epId = ctx.endPoint.userId;
        if (!ctx.isPrivate) {
          const gid = ctx.group.groupId;
          const data = await globalThis.http.getData(epId, `get_group_member_list?group_id=${gid.replace(/\D+/g, "")}`);
          for (let i = 0; i < data.length; i++) {
            if (name === data[i].card || name === data[i].nickname) {
              return `QQ:${data[i].user_id}`;
            }
          }
        }
        if (findInFriendList) {
          const data = await globalThis.http.getData(epId, "get_friend_list");
          for (let i = 0; i < data.length; i++) {
            if (name === data[i].nickname || name === data[i].remark) {
              return `QQ:${data[i].user_id}`;
            }
          }
        }
      }
      if (name.length > 4) {
        const distance = levenshteinDistance(name, ctx.player.name);
        if (distance <= 2) {
          return ctx.player.userId;
        }
      }
      log(`未找到用户<${name}>`);
      return null;
    }
    async findGroupId(ctx, groupName) {
      if (groupName.length > 5 && !isNaN(parseInt(groupName))) {
        return `QQ-Group:${groupName}`;
      }
      const match = groupName.match(/^<([^>]+?)>(?:\(\d+\))?$|(.+?)\(\d+\)$/);
      if (match) {
        groupName = match[1] || match[2];
      }
      if (groupName === ctx.group.groupName) {
        return ctx.group.groupId;
      }
      const ext = seal.ext.find("HTTP依赖");
      if (ext) {
        const epId = ctx.endPoint.userId;
        const data = await globalThis.http.getData(epId, "get_group_list");
        for (let i = 0; i < data.length; i++) {
          if (groupName === data[i].group_name) {
            return `QQ-Group:${data[i].group_id}`;
          }
        }
      }
      if (groupName.length > 4) {
        const distance = levenshteinDistance(groupName, ctx.group.groupName);
        if (distance <= 2) {
          return ctx.group.groupId;
        }
      }
      log(`未找到群聊<${groupName}>`);
      return null;
    }
    getNames() {
      const names = [];
      for (const message of this.messages) {
        if (message.role === "user" && message.name && !names.includes(message.name)) {
          names.push(message.name);
        }
      }
      return names;
    }
  };

  // src/utils/utils_message.ts
  function buildSystemMessage(ctx) {
    const { roleSettingTemplate, showNumber } = ConfigManager.message;
    let [roleSettingIndex, _] = seal.vars.intGet(ctx, "$g人工智能插件专用角色设定序号");
    if (roleSettingIndex < 0 || roleSettingIndex >= roleSettingTemplate.length) {
      roleSettingIndex = 0;
    }
    let content = roleSettingTemplate[roleSettingIndex];
    if (!ctx.isPrivate) {
      content += `
**相关信息**
- 当前群聊:<${ctx.group.groupName}>${showNumber ? `(${ctx.group.groupId.replace(/\D+/g, "")})` : ``}
- <@xxx>表示@某个群成员，xxx为名字${showNumber ? `或者纯数字QQ号` : ``}`;
    } else {
      content += `
**相关信息**
- 当前私聊:<${ctx.player.name}>${showNumber ? `(${ctx.player.userId.replace(/\D+/g, "")})` : ``}`;
    }
    content += `- <|from:xxx${showNumber ? `(yyy)` : ``}|>表示消息来源，xxx为用户名字${showNumber ? `，yyy为纯数字QQ号` : ``}
- <|图片xxxxxx:yyy|>为图片，其中xxxxxx为6位的图片id，yyy为图片描述（可能没有），如果要发送出现过的图片请使用<|图片xxxxxx|>的格式`;
    const systemMessage = {
      role: "system",
      content,
      uid: "",
      name: "",
      timestamp: 0
    };
    return systemMessage;
  }
  function buildSamplesMessages(ctx) {
    const { samples } = ConfigManager.message;
    const samplesMessages = samples.map((item, index) => {
      if (item == "") {
        return null;
      } else if (index % 2 === 0) {
        return {
          role: "user",
          content: item,
          uid: "",
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
    }).filter((item) => item !== null);
    return samplesMessages;
  }
  function handleMessages(ctx, ai) {
    const { isPrefix, showNumber, isMerge } = ConfigManager.message;
    const systemMessage = buildSystemMessage(ctx);
    const samplesMessages = buildSamplesMessages(ctx);
    const messages = [systemMessage, ...samplesMessages, ...ai.context.messages];
    let processedMessages = [];
    let last_role = "";
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const prefix = isPrefix && message.name ? message.name.startsWith("_") ? `<|${message.name}|>` : `<|from:${message.name}${showNumber ? `(${message.uid.replace(/\D+/g, "")})` : ``}|>` : "";
      if (isMerge && message.role === last_role && message.role !== "tool") {
        processedMessages[processedMessages.length - 1].content += "\n" + prefix + message.content;
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

  // src/AI/service.ts
  var baseUrl = "http://localhost:3010";
  async function start_completion(messages) {
    const { url, apiKey, bodyTemplate } = ConfigManager.request;
    try {
      const bodyObject = parseBody(bodyTemplate, messages);
      const s = JSON.stringify(bodyObject.messages, (key, value) => {
        if (key === "" && Array.isArray(value)) {
          return value.filter((item) => {
            return item.role !== "system";
          });
        }
        return value;
      });
      log(`请求发送前的上下文:
`, s);
      const response = await fetch(`${baseUrl}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          url,
          api_key: apiKey,
          body_obj: bodyObject
        })
      });
      console.log("响应体", JSON.stringify(response, null, 2));
      const data = await response.json();
      if (!response.ok) {
        let s2 = `请求失败! 状态码: ${response.status}`;
        if (data.error) {
          s2 += `
错误信息: ${data.error.message}`;
        }
        s2 += `
响应体: ${JSON.stringify(data, null, 2)}`;
        throw new Error(s2);
      }
      if (data.id) {
        const id = data.id;
        return id;
      } else {
        throw new Error("服务器响应中没有id字段");
      }
    } catch (error) {
      console.error("在start_completion中出错：", error);
      return "";
    }
  }
  async function poll_completion(id, after) {
    try {
      const response = await fetch(`${baseUrl}/poll?id=${id}&after=${after}`, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });
      const data = await response.json();
      if (!response.ok) {
        let s = `请求失败! 状态码: ${response.status}`;
        if (data.error) {
          s += `
错误信息: ${data.error.message}`;
        }
        s += `
响应体: ${JSON.stringify(data, null, 2)}`;
        throw new Error(s);
      }
      if (data.status) {
        const status = data.status;
        const reply = data.results.join("");
        const nextAfter = data.next_after;
        return { status, reply, nextAfter };
      } else {
        throw new Error("服务器响应中没有status字段");
      }
    } catch (error) {
      console.error("在start_completion中出错：", error);
      return { status: "failed", reply: "", nextAfter: 0 };
    }
  }
  async function end_completion(id) {
    try {
      const response = await fetch(`${baseUrl}/end?id=${id}`, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });
      const data = await response.json();
      if (!response.ok) {
        let s = `请求失败! 状态码: ${response.status}`;
        if (data.error) {
          s += `
错误信息: ${data.error.message}`;
        }
        s += `
响应体: ${JSON.stringify(data, null, 2)}`;
        throw new Error(s);
      }
      if (data.status) {
        const status = data.status;
        if (status === "success") {
          log(`对话结束成功`);
        } else {
          log(`对话结束失败`);
        }
        return status;
      } else {
        throw new Error("服务器响应中没有status字段");
      }
    } catch (error) {
      console.error("在start_completion中出错：", error);
      return "";
    }
  }
  function parseBody(template, messages) {
    const bodyObject = {};
    for (let i = 0; i < template.length; i++) {
      const s = template[i];
      if (s.trim() === "") {
        continue;
      }
      try {
        const obj = JSON.parse(`{${s}}`);
        const key = Object.keys(obj)[0];
        bodyObject[key] = obj[key];
      } catch (err) {
        throw new Error(`解析body的【${s}】时出现错误:${err}`);
      }
    }
    if ((bodyObject == null ? void 0 : bodyObject.messages) === null) {
      bodyObject.messages = messages;
    }
    if ((bodyObject == null ? void 0 : bodyObject.stream) !== true) {
      console.error(`不支持不流式传输，请将stream设置为true`);
      bodyObject.stream = false;
    }
    bodyObject == null ? true : delete bodyObject.tools;
    bodyObject == null ? true : delete bodyObject.tool_choice;
    return bodyObject;
  }

  // src/AI/AI.ts
  var AI = class _AI {
    constructor(id) {
      this.id = id;
      this.context = new Context();
      this.privilege = {
        limit: 100,
        counter: -1,
        timer: -1,
        prob: -1,
        standby: false
      };
    }
    static reviver(value, id) {
      const ai = new _AI(id);
      const validKeys = ["context", "image", "privilege"];
      for (const k of validKeys) {
        if (value.hasOwnProperty(k)) {
          ai[k] = value[k];
        }
      }
      return ai;
    }
    clearData() {
      clearTimeout(this.context.timer);
      this.context.timer = null;
      this.context.counter = 0;
    }
    async chat(ctx, msg) {
      if (this.streamId) {
        await end_completion(this.streamId);
      }
      this.streamId = "";
      this.clearData();
      const messages = handleMessages(ctx, this);
      this.streamId = await start_completion(messages);
      let pollStatus = "processing";
      let allReply = "";
      let after = 0;
      while (pollStatus == "processing") {
        const { status, reply, nextAfter } = await poll_completion(this.streamId, after);
        pollStatus = status;
        after = nextAfter;
        if (reply.trim() !== "") {
          allReply += reply.trim();
          seal.replyToSender(ctx, msg, reply.trim());
        } else {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      await end_completion(this.streamId);
      await this.context.iteration(ctx, allReply, "assistant");
      this.streamId = "";
    }
  };
  var AIManager = class {
    static clearCache() {
      this.cache = {};
    }
    static getAI(id) {
      if (!this.cache.hasOwnProperty(id)) {
        let data = new AI(id);
        try {
          data = JSON.parse(ConfigManager.ext.storageGet(`AI_${id}`) || "{}", (key, value) => {
            if (key === "") {
              return AI.reviver(value, id);
            }
            if (key === "context") {
              return Context.reviver(value);
            }
            return value;
          });
        } catch (error) {
          console.error(`从数据库中获取${`AI_${id}`}失败:`, error);
        }
        this.cache[id] = data;
      }
      return this.cache[id];
    }
    static saveAI(id) {
      if (this.cache.hasOwnProperty(id)) {
        ConfigManager.ext.storageSet(`AI_${id}`, JSON.stringify(this.cache[id]));
      }
    }
  };
  AIManager.cache = {};

  // src/index.ts
  function main() {
    let ext = seal.ext.find("aistream");
    if (!ext) {
      ext = seal.ext.new("aistream", "baiyu&错误", "1.0.0");
      seal.ext.register(ext);
    }
    ConfigManager.ext = ext;
    ConfigManager.registerConfig();
    const CQTypesAllow = ["at", "image", "reply", "face"];
    const cmdAI = seal.ext.newCmdItemInfo();
    cmdAI.name = "aistr";
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
        case "st": {
          if (ctx.privilegeLevel < 100) {
            seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "核心:提示_无权限"));
            return ret;
          }
          const val2 = cmdArgs.getArgN(2);
          if (!val2 || val2 == "help") {
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
            seal.replyToSender(ctx, msg, "权限值必须为数字");
            return ret;
          }
          const id2 = val2 === "now" ? id : val2;
          const ai2 = AIManager.getAI(id2);
          ai2.privilege.limit = limit;
          seal.replyToSender(ctx, msg, "权限修改完成");
          AIManager.saveAI(id2);
          return ret;
        }
        case "ck": {
          if (ctx.privilegeLevel < 100) {
            seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "核心:提示_无权限"));
            return ret;
          }
          const val2 = cmdArgs.getArgN(2);
          if (!val2 || val2 == "help") {
            const s2 = `帮助:
【.ai ck <ID>】

<ID>:
【QQ:1234567890】 私聊窗口
【QQ-Group:1234】 群聊窗口
【now】当前窗口`;
            seal.replyToSender(ctx, msg, s2);
            return ret;
          }
          const id2 = val2 === "now" ? id : val2;
          const ai2 = AIManager.getAI(id2);
          const pr = ai2.privilege;
          const counter = pr.counter > -1 ? `${pr.counter}条` : "关闭";
          const timer = pr.timer > -1 ? `${pr.timer}秒` : "关闭";
          const prob = pr.prob > -1 ? `${pr.prob}%` : "关闭";
          const standby = pr.standby ? "开启" : "关闭";
          const s = `${id2}
权限限制:${pr.limit}
计数器模式(c):${counter}
计时器模式(t):${timer}
概率模式(p):${prob}
待机模式:${standby}`;
          seal.replyToSender(ctx, msg, s);
          return ret;
        }
        case "prompt": {
          if (ctx.privilegeLevel < 100) {
            seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "核心:提示_无权限"));
            return ret;
          }
          const systemMessage = buildSystemMessage(ctx);
          seal.replyToSender(ctx, msg, systemMessage.content);
          return ret;
        }
        case "pr": {
          const pr = ai.privilege;
          if (ctx.privilegeLevel < pr.limit) {
            seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "核心:提示_无权限"));
            return ret;
          }
          const counter = pr.counter > -1 ? `${pr.counter}条` : "关闭";
          const timer = pr.timer > -1 ? `${pr.timer}秒` : "关闭";
          const prob = pr.prob > -1 ? `${pr.prob}%` : "关闭";
          const standby = pr.standby ? "开启" : "关闭";
          const s = `${id}
权限限制:${pr.limit}
计数器模式(c):${counter}
计时器模式(t):${timer}
概率模式(p):${prob}
待机模式:${standby}`;
          seal.replyToSender(ctx, msg, s);
          return ret;
        }
        case "ctxn": {
          const pr = ai.privilege;
          if (ctx.privilegeLevel < pr.limit) {
            seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "核心:提示_无权限"));
            return ret;
          }
          const names = ai.context.getNames();
          const s = `上下文里的名字有：
<${names.join(">\n<")}>`;
          seal.replyToSender(ctx, msg, s);
          return ret;
        }
        case "on": {
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

【.ai on --t --p=42】使用示例`;
            seal.replyToSender(ctx, msg, s);
            return ret;
          }
          let text = `AI已开启：`;
          kwargs.forEach((kwarg) => {
            const name = kwarg.name;
            const exist = kwarg.valueExists;
            const value = parseFloat(kwarg.value);
            switch (name) {
              case "c":
              case "counter": {
                pr.counter = exist && !isNaN(value) ? value : 10;
                text += `
计数器模式:${pr.counter}条`;
                break;
              }
              case "t":
              case "timer": {
                pr.timer = exist && !isNaN(value) ? value : 60;
                text += `
计时器模式:${pr.timer}秒`;
                break;
              }
              case "p":
              case "prob": {
                pr.prob = exist && !isNaN(value) ? value : 10;
                text += `
概率模式:${pr.prob}%`;
                break;
              }
            }
          });
          pr.standby = true;
          seal.replyToSender(ctx, msg, text);
          AIManager.saveAI(id);
          return ret;
        }
        case "sb": {
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
          seal.replyToSender(ctx, msg, "AI已开启待机模式");
          AIManager.saveAI(id);
          return ret;
        }
        case "off": {
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
            seal.replyToSender(ctx, msg, "AI已关闭");
            AIManager.saveAI(id);
            return ret;
          }
          let text = `AI已关闭：`;
          kwargs.forEach((kwarg) => {
            const name = kwarg.name;
            switch (name) {
              case "c":
              case "counter": {
                pr.counter = -1;
                text += `
计数器模式`;
                break;
              }
              case "t":
              case "timer": {
                pr.timer = -1;
                text += `
计时器模式`;
                break;
              }
              case "p":
              case "prob": {
                pr.prob = -1;
                text += `
概率模式`;
                break;
              }
            }
          });
          ai.clearData();
          seal.replyToSender(ctx, msg, text);
          AIManager.saveAI(id);
          return ret;
        }
        case "f":
        case "fgt": {
          const pr = ai.privilege;
          if (ctx.privilegeLevel < pr.limit) {
            seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "核心:提示_无权限"));
            return ret;
          }
          ai.clearData();
          const val2 = cmdArgs.getArgN(2);
          const messages = ai.context.messages;
          switch (val2) {
            case "ass":
            case "assistant": {
              ai.context.messages = messages.filter((item) => item.role !== "assistant");
              seal.replyToSender(ctx, msg, "ai上下文已清除");
              AIManager.saveAI(id);
              return ret;
            }
            case "user": {
              ai.context.messages = messages.filter((item) => item.role !== "user");
              seal.replyToSender(ctx, msg, "用户上下文已清除");
              AIManager.saveAI(id);
              return ret;
            }
            default: {
              ai.context.messages = [];
              seal.replyToSender(ctx, msg, "上下文已清除");
              AIManager.saveAI(id);
              return ret;
            }
          }
        }
        case "help":
        default: {
          ret.showHelp = true;
          return ret;
        }
      }
    };
    ext.cmdMap["aistr"] = cmdAI;
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
      const CQTypes = getCQTypes(message);
      if (CQTypes.length === 0 || CQTypes.every((item) => CQTypesAllow.includes(item))) {
        if (CQTypes.includes("image")) {
          message = message.replace(/\[CQ:image,file=.*?\]/g, "[图片]");
        }
        clearTimeout(ai.context.timer);
        ai.context.timer = null;
        for (const keyword of keyWords) {
          try {
            const pattern = new RegExp(keyword);
            if (!pattern.test(message)) {
              continue;
            }
          } catch (error) {
            console.error("Error in RegExp:", error);
            continue;
          }
          const fmtCondition = parseInt(seal.format(ctx, `{${condition}}`));
          if (fmtCondition === 1) {
            await ai.context.iteration(ctx, message, "user");
            log("非指令触发回复");
            await ai.chat(ctx, msg);
            AIManager.saveAI(id);
            return;
          }
        }
        const pr = ai.privilege;
        if (pr.standby) {
          await ai.context.iteration(ctx, message, "user");
        }
        if (pr.counter > -1) {
          ai.context.counter += 1;
          if (ai.context.counter >= pr.counter) {
            log("计数器触发回复");
            ai.context.counter = 0;
            await ai.chat(ctx, msg);
            AIManager.saveAI(id);
            return;
          }
        }
        if (pr.prob > -1) {
          const ran = Math.random() * 100;
          if (ran <= pr.prob) {
            log("概率触发回复");
            await ai.chat(ctx, msg);
            AIManager.saveAI(id);
            return;
          }
        }
        if (pr.timer > -1) {
          ai.context.timer = setTimeout(async () => {
            log("计时器触发回复");
            ai.context.timer = null;
            await ai.chat(ctx, msg);
            AIManager.saveAI(id);
          }, pr.timer * 1e3 + Math.floor(Math.random() * 500));
        }
      }
    };
    ext.onCommandReceived = async (ctx, msg, _) => {
      const { allcmd } = ConfigManager.received;
      if (allcmd) {
        const uid = ctx.player.userId;
        const gid = ctx.group.groupId;
        const id = ctx.isPrivate ? uid : gid;
        const ai = AIManager.getAI(id);
        let message = msg.message;
        const CQTypes = getCQTypes(message);
        if (CQTypes.length === 0 || CQTypes.every((item) => CQTypesAllow.includes(item))) {
          const pr = ai.privilege;
          if (pr.standby) {
            message = message.replace(/\[CQ:image,file=.*?\]/g, "[图片]");
            await ai.context.iteration(ctx, message, "user");
          }
        }
      }
    };
    ext.onMessageSend = async (ctx, msg) => {
      const uid = ctx.player.userId;
      const gid = ctx.group.groupId;
      const id = ctx.isPrivate ? uid : gid;
      const ai = AIManager.getAI(id);
      let message = msg.message;
      const { allmsg } = ConfigManager.received;
      if (allmsg) {
        const CQTypes = getCQTypes(message);
        if (CQTypes.length === 0 || CQTypes.every((item) => CQTypesAllow.includes(item))) {
          const pr = ai.privilege;
          if (pr.standby) {
            message = message.replace(/\[CQ:image,file=.*?\]/g, "[图片]");
            await ai.context.iteration(ctx, message, "assistant");
            return;
          }
        }
      }
    };
  }
  main();
})();
