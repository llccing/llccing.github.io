"""
EXP-003: 最小 RAG（检索增强生成）流程

目的：不依赖 Bedrock Knowledge Bases，用最朴素的方式跑通 RAG 原理，
     理解「检索 → 增强 → 生成」三个环节各自在做什么。

依赖：
  pip install boto3
  （向量部分用一个极简的手写余弦相似度，不引入额外依赖，方便理解原理）

流程：
  文档 → 切分 chunk → 粗略向量化 → 存起来
  问题 → 向量化 → 相似度检索 top-k → 拼进 prompt → 交给 FM 生成
"""

import json
import math
import re
from collections import Counter

import boto3

MODEL_ID = "amazon.nova-lite-v1:0"
REGION = "us-east-1"


# ---------- 1. 极简「向量化」：词频向量 ----------
# 真实生产里应换成 Embedding 模型（如 Titan Embeddings）。
# 这里用词频 + 余弦相似度，只是为了看清 RAG 的骨架。
def tokenize(text: str) -> list[str]:
    # 英文按空格，中文按字，做一个粗糙的混合切分
    return re.findall(r"[a-zA-Z0-9]+|[\u4e00-\u9fff]", text.lower())


def to_vector(text: str) -> Counter:
    return Counter(tokenize(text))


def cosine(a: Counter, b: Counter) -> float:
    common = set(a) & set(b)
    dot = sum(a[k] * b[k] for k in common)
    norm_a = math.sqrt(sum(v * v for v in a.values()))
    norm_b = math.sqrt(sum(v * v for v in b.values()))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


# ---------- 2. 文档切分 ----------
def chunk(text: str, size: int = 120) -> list[str]:
    """按固定长度切分，工程里会用重叠切分来保留上下文。"""
    return [text[i : i + size] for i in range(0, len(text), size)]


# ---------- 3. 检索 ----------
def retrieve(query: str, chunks: list[str], top_k: int = 2) -> list[str]:
    q_vec = to_vector(query)
    scored = [(cosine(q_vec, to_vector(c)), c) for c in chunks]
    scored.sort(reverse=True, key=lambda x: x[0])
    return [c for _, c in scored[:top_k]]


# ---------- 4. 生成 ----------
def generate(prompt: str) -> str:
    client = boto3.client("bedrock-runtime", region_name=REGION)
    body = {
        "messages": [{"role": "user", "content": [{"text": prompt}]}],
        "inferenceConfig": {"maxTokens": 256, "temperature": 0.2},
    }
    resp = client.invoke_model(
        modelId=MODEL_ID,
        contentType="application/json",
        accept="application/json",
        body=json.dumps(body),
    )
    return json.loads(resp["body"].read())["output"]["message"]["content"][0]["text"]


def rag_answer(query: str, chunks: list[str]) -> str:
    context = "\n".join(retrieve(query, chunks))
    prompt = (
        "请只根据下面提供的资料回答问题，资料中没有的信息不要编造。\n\n"
        f"【资料】\n{context}\n\n"
        f"【问题】\n{query}\n"
    )
    return generate(prompt)


if __name__ == "__main__":
    # 模拟一个私有知识库
    DOC = (
        "本公司的报销流程如下：员工先填写报销单，附上发票原件，"
        "提交给直属主管审批。主管审批通过后，财务部门在 5 个工作日内打款。"
        "差旅报销需要额外提供行程单。单笔超过 5000 元的报销需要总监二次审批。"
    )
    chunks = chunk(DOC)
    question = "超过多少钱需要总监审批？"

    print(f"[切分] 共得到 {len(chunks)} 个 chunk")
    print(f"[检索到的上下文]\n{retrieve(question, chunks)}")
    print(f"[回答] {rag_answer(question, chunks)}")
