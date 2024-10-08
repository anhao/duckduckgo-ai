import {Hono} from 'hono'
import {z} from "zod";
import {validator} from "hono/validator";
import {OpenAIRequest, OpenAIResponse, OpenAIStreamResponse} from "./types";
import {streamSSE} from 'hono/streaming'
import {cors} from 'hono/cors'

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
  "Accept": "text/event-stream",
  "Accept-Language": "de,en-US;q=0.7,en;q=0.3",
  "Accept-Encoding": "gzip, deflate, br",
  "Referer": "https://duckduckgo.com/?q=DuckDuckGo&ia=chat",
  "Content-Type": "application/json",
  "Origin": "https://duckduckgo.com",
  "Connection": "keep-alive",
  "Cookie": "dcm=1; bg=-1",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "Pragma": "no-cache",
  "TE": "trailers",
  "x-vqd-accept": "1",
  "cache-control": "no-store"
}
const statusURL = "https://duckduckgo.com/duckchat/v1/status"
const chatURL = "https://duckduckgo.com/duckchat/v1/chat"
const schema = z.object({
  model: z.string().default("gpt-4o-mini"),
  messages: z.array(z.object({
    role: z.string(),
    content: z.string()
  })),
  stream: z.boolean().optional()
})

const models = [
  "gpt-4o-mini",
  "claude-3-haiku-20240307",
  "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
  "mistralai/Mixtral-8x7B-Instruct-v0.1"
]

const app = new Hono()

app.use('/*', cors({
  origin: "*",
}))

const getXcqd4 = async function () {
  const res = await fetch(statusURL, {
    method: "GET",
    headers: headers,
  })
  return res.headers.get("x-vqd-4")
}

app.get('/', (c) => {
  return c.text('Hello Hono!')
})
app.get("/v1/models", (c) => {
  const list = []
  for (let model of models) {
    list.push({
      id: model,
      object: "model",
      "created": 1686935002,
      "owned_by": "duckduckgo-ai",
    })
  }
  return c.json({
    "object": "list",
    "data": list
  })
})


app.post("/v1/chat/completions", validator('json', (value, c) => {
  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    return c.json({error: parsed.error.errors[0].message}, 400)
  }
  return parsed.data
}), async (c) => {
  // @ts-ignore
  const apikey = c.env["apikey"] ?? ''
  if (apikey) {
    const authorization = c.req.header("Authorization")
    if (!authorization) {
      return c.json({"error": "authorization error"}, 401)
    }
    if (apikey !== authorization.substring(7)) {
      return c.json({"error": "apikey error"}, 401)
    }
  }


  const params = await c.req.json<OpenAIRequest>()
  const requestParams = {
    "model": params.model,
    "messages": []
  }
  const messages = []
  for (let message of params.messages) {
    if (message.role === 'system') {
      messages.push({"role": "user", "content": message.content})
    } else {
      messages.push(message)
    }
  }
  // @ts-ignore
  requestParams["messages"] = messages
  try {
    let x4 = c.req.header("x-vqd-4")
    if (!x4) {
      x4 = await getXcqd4() || ""
    }
    if (!x4) {
      return c.json({error: "x-xqd-4 get error"}, 400)
    }
    const resp = await fetch(chatURL, {
      method: "POST",
      headers: {"x-vqd-4": x4, ...headers},
      body: JSON.stringify(requestParams)
    })

    if (!resp.ok) {
      return c.json({"error": "api request error", "message": await resp.text()}, 400)
    }
    c.header("x-vqd-4", resp.headers.get("x-vqd-4") || "")
    let responseContent = ""
    if (params.stream) {
      return streamSSE(c, async (stream) => {
        if (!resp.body) {
          return
        }
        const reader = resp.body.getReader();
        let decoder = new TextDecoder();
        let buffer = '';
        try {
          while (true) {
            const {done, value} = await reader.read();
            if (done) {
              break;
            }
            buffer += decoder.decode(value, {stream: true});
            const parts = buffer.split('\n');
            buffer = parts.pop() || '';
            for (let part of parts) {
              let response = null;
              part = part.substring(6)//remove data:
              if (part === "[DONE]") {
                const openAIResponse = {
                  id: "chat-",
                  object: "chat.completion",
                  created: (new Date()).getTime(),
                  model: params.model,
                  choices: [
                    {
                      index: 0,
                      finish_reason: "stop",
                      content_filter_results: null,
                      delta: {}
                    }
                  ],
                  system_fingerprint: "fp_44709d6fcb"
                }

                await stream.writeSSE({
                  data: JSON.stringify(openAIResponse),
                });

                await stream.writeSSE({
                  data: "[DONE]"
                });
                return
              }
              try {
                response = JSON.parse(part)
              } catch {
                console.log('response parse error')
              }
              if (response) {
                const openAIResponse: OpenAIStreamResponse = {
                  id: "chatcmpl-duckduck-ai",
                  object: "chat.completion",
                  created: (new Date()).getTime() / 1000,
                  model: params.model,
                  choices: [
                    {
                      index: 0,
                      delta: {
                        role: response["role"],
                        content: response["message"]
                      },
                      finish_reason: null,
                      content_filter_results: null,
                    }
                  ]
                }

                await stream.writeSSE({
                  data: JSON.stringify(openAIResponse),
                });
              }
            }
          }
        } catch (e) {
          console.error("Error reading from SSE stream:", e);
        } finally {
          reader.releaseLock();
        }
      });
    }
    if (resp.body) {
      const buffer = await resp.text()
      const parts = buffer.split("\n\n")
      for (let part of parts) {
        part = part.substring(6)
        if(part === "[DONE]"){
          break;
        }
        try {
          const parseJson = JSON.parse(part)
          responseContent += parseJson["message"]??''
        } catch {
          console.log('parse error')
        }
      }
      const response: OpenAIResponse = {
        id: "chatcmpl-duckduck-ai",
        object: "chat.completion",
        created: (new Date()).getTime() / 1000,
        model: params.model,
        system_fingerprint: "fp_44709d6fcb",
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: responseContent,
          },
          logprobs: null,
          finish_reason: "stop"
        }],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      }
      return c.json(response)
    }
  } catch
    (e) {
    return c.json({error: e}, 400)
  }

})
export default app
