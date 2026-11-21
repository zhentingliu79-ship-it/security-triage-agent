# 安全扫描结果研判 Agent

这是面向 AI 训练师岗位的作品集实验：本地模型读取**合成**安全扫描发现，调用工具提出四类研判、优先级和证据 ID，生成待人工复核的草稿。它不连接真实目标，也不执行扫描、利用或修复。

项目已经完成 30 条合成案例、标注规范、模型运行、开发集分析和保留集评测。详细结果见 [实验报告](FINAL_REPORT.md)。

## 运行

在仓库目录中使用 Node.js 20+。离线数据校验：

```powershell
node src/eval.mjs
node src/cli.mjs demo F001
```

安装 Ollama 后，下载模型并运行：

```powershell
ollama pull qwen3:4b
node src/cli.mjs ask-local-reviewed F001
```

带有 `ask-local-reviewed` 的命令会显示模型草稿、规则复核、工具轨迹及与参考标签的比较。只看模型原始判断时运行 `node src/cli.mjs ask-local F001`。`node src/cli.mjs demo F001` 是固定离线示例，不能当作模型表现。

批量复现：

```powershell
node src/eval-local.mjs --split development --policy-review
node src/eval-local.mjs --split holdout --policy-review
```

每次重新运行都可能产生不同结果；报告数字对应 [公开评测摘要](evidence/evaluation-summary.json)。无需 OpenAI API key 或付费额度。

## 实验结果

19 条保留案例中，模型原始类别判断正确 15 条；加入基于开发集错误制定的可审计规则复核后，系统正确 17 条。优先级正确 18 条，仍有两条信息泄露案例误判。30 条参考标签未经第二位独立标注者复核；这是小样本合成数据实验，不能推断真实场景准确率。规则提升是系统工程改进，模型没有微调。

数据与代码入口：[发现案例](data/findings.json) · [标签规范](data/rubric.md) · [数据划分](data/splits.json) · [本地 Agent](src/agent-local.mjs) · [评测脚本](src/eval-local.mjs)。逐步学习资料仍见 [学习路线](LEARNING_PLAN.md)。

## 许可证

[MIT](LICENSE)。本地运行时使用的模型由模型发行方提供，遵循其各自的许可条款。
