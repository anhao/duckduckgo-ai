export interface OpenAIRequest {
  model: string
  messages: {
    role: string,
    content: string
  }[],
  stream: boolean,
}

export interface OpenAIResponse {
  "id": string,
  "object": string,
  "created": number,
  "model": string,
  "system_fingerprint": string,
  "choices": [{
    "index": number,
    "message"?: {
      "role": string,
      "content": string,
    },
    "logprobs"?: null,
    "finish_reason"?: string
  }],
  "usage": {
    "prompt_tokens": number,
    "completion_tokens": number,
    "total_tokens": number
  }
}

export interface OpenAIStreamResponse {
  id: string,
  object: string,
  created: number,
  model: string,
  choices: [
    {
      index: number,
      delta?: {
        role: string,
        content: string
      },
      finish_reason?: string | null,
      content_filter_results?: null,
    }
  ]
}
