# DuckDuckGo  AI

使用 Cloudflare Worker 部署免费 DuckDuckGo AI,支持 **gpt-3.5-turbo-0125**,**claude-3-haiku-20240307** 等模型

DuckDuckGo AI : https://duckduckgo.com/?q=DuckDuckGo&ia=chat

## 部署

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/anhao/duckduckgo-ai)

```shell

git clone https://github.com/anhao/duckduckgo-ai.git

cd duckduckgo-ai

npm install 

npm run deploy

```

## 支持的模型

- gpt-4o-mini
- claude-3-haiku-20240307
- meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo
- mistralai/Mixtral-8x7B-Instruct-v0.1

## 使用

把 **worker_url** 改成自己的

```shell
    curl https://worker_url/v1/chat/completions \
    -H "Authorization: Bearer $YOU_APIKEY" \
    -H "Content-Type: application/json" \
    -d '{
        "model": "gpt-3.5-turbo-0125",
        "messages": [{"role": "user", "content": "Hello"}],
    }'

```

## 授权访问

在 `wrangler.toml` 设置 `apikey` 参数的值，如果不设置则所有人都可以请求。

```
[vars]
apikey = "" ## 设置apikey值，如果不设置则所有人都可以请求。 
```

## 已知问题

目前不能支持连续对话，就是 messages 只能传一次对话。

如果要传递多次的话需要手动传递 **x-vqd-4** 参数值到请求头。

**x-vqd-4**参数会在第一次对话后返回在响应头里面，然后后续请求需要传递 **x-vqd-4** 值，每新加一次对话都需要传递新的
**x-vqd-4** 参数

- [ ] 通过对话**hash**到 **cloudflare kv** 来实现程序自动传递 **x-vqd-4**