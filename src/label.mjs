import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { getFinding, validateDraft } from './domain.mjs';

const id = process.argv[2]?.toUpperCase();
if (!id) {
  console.error('用法: node src/label.mjs F003');
  process.exit(1);
}
const finding = await getFinding(id);
if (finding.error) {
  console.error(`找不到案例 ${id}`);
  process.exit(1);
}

console.log(`\n${id}：${finding.title}`);
console.log(`扫描器严重度：${finding.scannerSeverity}`);
for (const evidence of finding.evidence) console.log(`证据 ${evidence.id}：${evidence.text}`);
console.log(`背景：${finding.context}\n`);

const rl = createInterface({ input: process.stdin, output: process.stdout });
async function choose(prompt, options) {
  while (true) {
    const answer = (await rl.question(`${prompt} (${options.join(' / ')})：`)).trim();
    if (options.includes(answer)) return answer;
    console.log('请从括号中的选项输入。');
  }
}

try {
  const verdict = await choose('类别 verdict', ['confirmed', 'false_positive', 'needs_verification', 'invalid_input']);
  const priority = await choose('优先级 priority', ['high', 'medium', 'low']);
  const evidenceIds = (await rl.question(`证据 ID（此案例可用：${finding.evidence.map((e) => e.id).join(', ')}）：`)).trim().split(/[,，\s]+/).filter(Boolean);
  const reason = (await rl.question('用一句话说明理由：')).trim();
  const draft = { id, verdict, priority, evidenceIds, reason };
  const check = validateDraft(finding, draft);
  if (!check.ok) {
    console.error(`未保存：${check.error}。理由至少 10 个字符，证据 ID 必须存在。`);
    process.exitCode = 1;
  } else {
    const path = new URL('../work/my_labels.json', import.meta.url);
    const labels = await readFile(path, 'utf8').then(JSON.parse, (error) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    await mkdir(new URL('../work/', import.meta.url), { recursive: true });
    const index = labels.findIndex((item) => item.id === id);
    if (index < 0) labels.push(draft); else labels[index] = draft;
    await writeFile(path, `${JSON.stringify(labels, null, 2)}\n`, 'utf8');
    console.log(`已保存 ${id}。核对时运行：node src/check-labels.mjs`);
  }
} finally {
  try { rl.close(); }
  catch (error) { if (error.code !== 'EPERM') throw error; }
}
