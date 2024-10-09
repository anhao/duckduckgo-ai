# DuckDuckGo AI

[中文说明](README.zh.md)

Deploy a free DuckDuckGo AI using Cloudflare Worker, supporting models like **gpt-3.5-turbo-0125**,**claude-3-haiku-20240307**, ...

DuckDuckGo AI: https://duckduckgo.com/?q=DuckDuckGo&ia=chat

## Deployment


```shell
git clone https://github.com/anhao/duckduckgo-ai.git
cd duckduckgo-ai
npm install
npm run deploy
```

## Supported Models

- gpt-4o-mini
- claude-3-haiku-20240307
- meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo
- mistralai/Mixtral-8x7B-Instruct-v0.1

## Usage

Replace **worker_url** with your own:

```shell
curl https://worker_url/v1/chat/completions \
-H "Authorization: Bearer $YOU_APIKEY" \
-H "Content-Type: application/json" \
-d '{
    "model": "gpt-3.5-turbo-0125",
    "messages": [{"role": "user", "content": "Hello"}],
}'
```

## Authorization Access

In the `wrangler.toml` file, set the value of the `apikey` parameter. If not set, anyone can make requests.

```
[vars]
apikey = "" ## Set the apikey value, if not set, anyone can make requests.
```

## Known Issues

Currently, it does not support continuous dialogue, meaning the `messages` can only be passed once.

If you want to pass multiple messages, you need to manually pass the `x-vqd-4` parameter value to the request header.

The `x-vqd-4` parameter will be returned in the response header after the first dialogue, and subsequent requests need
to pass the `x-vqd-4` value. A new `x-vqd-4` parameter is required for each new dialogue added.

- [ ] Automatically pass the **x-vqd-4** by storing the conversation **hash** in **Cloudflare KV**
