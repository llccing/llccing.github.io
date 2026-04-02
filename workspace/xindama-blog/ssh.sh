#!/bin/bash

# 需要手动在命令行中执行，下面的命令，不可以通过shell，因为不是同一个shell  session
# 启动 SSH 代理
eval "$(ssh-agent -s)"
# 添加 SSH 密钥
ssh-add ~/.ssh/id_ed25519
# 列出已添加的 SSH 密钥
ssh-add -l
# 测试与 GitHub 的连接
ssh -T git@github.com

