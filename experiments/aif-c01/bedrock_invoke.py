"""
EXP-001: 调用 Amazon Bedrock 模型

目的：跑通一次 Bedrock 模型调用，理解请求/响应结构。

前置：
  1. pip install boto3
  2. aws configure（或在环境变量里配好凭据）
  3. 在 Bedrock 控制台开通目标模型的访问权限

注意：Bedrock 按 Token 计费，先用小模型、短 prompt 试。
"""

import json

import boto3

# 按需替换为你已开通的模型 ID
# 常见选择：
#   - amazon.nova-lite-v1:0            （Amazon Nova，便宜）
#   - anthropic.claude-3-haiku-20240307-v1:0  （Claude Haiku）
#   - meta.llama3-8b-instruct-v1:0     （Llama 3）
MODEL_ID = "amazon.nova-lite-v1:0"

REGION = "us-east-1"


def invoke_model(prompt: str) -> str:
    """调用 Bedrock 模型并返回文本输出。"""
    client = boto3.client("bedrock-runtime", region_name=REGION)

    # 这里以 Amazon Nova 的消息格式为例。
    # 不同模型厂商的请求体结构不同（Claude 用 "anthropic_version" +
    # "messages"，Llama 用 "prompt"），练习时注意区分。
    body = {
        "messages": [{"role": "user", "content": [{"text": prompt}]}],
        "inferenceConfig": {
            "maxTokens": 256,
            "temperature": 0.7,
            "topP": 0.9,
        },
    }

    response = client.invoke_model(
        modelId=MODEL_ID,
        contentType="application/json",
        accept="application/json",
        body=json.dumps(body),
    )

    result = json.loads(response["body"].read())
    # Nova 的输出路径
    return result["output"]["message"]["content"][0]["text"]


if __name__ == "__main__":
    question = "用一句话解释什么是 RAG（检索增强生成）。"
    print(f"[模型] {MODEL_ID}")
    print(f"[提问] {question}")
    print(f"[回答] {invoke_model(question)}")
