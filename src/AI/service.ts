import { ConfigManager } from "../config/config";
import { log } from "../utils/utils";

const baseUrl = 'http://localhost:3010';

export async function start_completion(messages: {
    role: string,
    content: string
}[]) {
    const { url, apiKey, bodyTemplate } = ConfigManager.request;

    try {
        const bodyObject = parseBody(bodyTemplate, messages);

        // 打印请求发送前的上下文
        const s = JSON.stringify(bodyObject.messages, (key, value) => {
            if (key === "" && Array.isArray(value)) {
                return value.filter(item => {
                    return item.role !== "system";
                });
            }
            return value;
        });
        log(`请求发送前的上下文:\n`, s);

        const response = await fetch(`${baseUrl}/start`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                url: url,
                api_key: apiKey,
                body_obj: bodyObject
            })
        });

        console.log("响应体", JSON.stringify(response, null, 2));

        const data = await response.json();

        if (!response.ok) {
            let s = `请求失败! 状态码: ${response.status}`;
            if (data.error) {
                s += `\n错误信息: ${data.error.message}`;
            }

            s += `\n响应体: ${JSON.stringify(data, null, 2)}`;

            throw new Error(s);
        }

        if (data.id) {

            const id = data.id;

            return id;
        } else {
            throw new Error("服务器响应中没有id字段");
        }
    } catch (error) {
        console.error("在start_completion中出错：", error);
        return '';
    }
}

export async function poll_completion(id: string, after: number) {
    try {
        const response = await fetch(`${baseUrl}/poll?id=${id}&after=${after}`, {
            method: 'GET',
            headers: {
                "Accept": "application/json"
            }
        });

        // console.log("响应体", JSON.stringify(response, null, 2));

        const data = await response.json();

        if (!response.ok) {
            let s = `请求失败! 状态码: ${response.status}`;
            if (data.error) {
                s += `\n错误信息: ${data.error.message}`;
            }

            s += `\n响应体: ${JSON.stringify(data, null, 2)}`;

            throw new Error(s);
        }

        if (data.status) {
            const status = data.status;
            const reply = data.results.join('');
            const nextAfter = data.next_after;

            return { status, reply, nextAfter };
        } else {
            throw new Error("服务器响应中没有status字段");
        }
    } catch (error) {
        console.error("在start_completion中出错：", error);
        return { status: 'failed', reply: '', nextAfter: 0 };
    }
}

export async function end_completion(id: string) {
    try {
        const response = await fetch(`${baseUrl}/end?id=${id}`, {
            method: 'GET',
            headers: {
                "Accept": "application/json"
            }
        });

        // console.log("响应体", JSON.stringify(response, null, 2));

        const data = await response.json();

        if (!response.ok) {
            let s = `请求失败! 状态码: ${response.status}`;
            if (data.error) {
                s += `\n错误信息: ${data.error.message}`;
            }

            s += `\n响应体: ${JSON.stringify(data, null, 2)}`;

            throw new Error(s);
        }

        if (data.status) {
            const status = data.status;
            if (status === 'success') {
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
        return '';
    }
}

function parseBody(template: string[], messages: any[]) {
    const bodyObject: any = {};

    for (let i = 0; i < template.length; i++) {
        const s = template[i];
        if (s.trim() === '') {
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

    if (bodyObject?.messages === null) {
        bodyObject.messages = messages;
    }

    if (bodyObject?.stream !== true) {
        console.error(`不支持不流式传输，请将stream设置为true`);
        bodyObject.stream = false;
    }


    delete bodyObject?.tools;
    delete bodyObject?.tool_choice;

    return bodyObject;
}