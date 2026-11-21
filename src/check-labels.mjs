import { readFile } from 'node:fs/promises';

const load = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const mine = await load('../work/my_labels.json').catch((error) => {
  if (error.code === 'ENOENT') return [];
  throw error;
});
const gold = await load('../data/labels.json');
const allowedVerdicts = new Set(['confirmed', 'false_positive', 'needs_verification', 'invalid_input']);
const allowedPriorities = new Set(['high', 'medium', 'low']);
let complete = 0, verdictCorrect = 0, priorityCorrect = 0, evidenceCorrect = 0;
for (const reference of gold) {
  const answer = mine.find((item) => item.id === reference.id);
  if (!answer || !allowedVerdicts.has(answer.verdict) || !allowedPriorities.has(answer.priority) || !Array.isArray(answer.evidenceIds) || !answer.evidenceIds.length || !answer.reason?.trim()) {
    console.log(`${reference.id}: 尚未完整标注`);
    continue;
  }
  complete++;
  const v = answer.verdict === reference.verdict;
  const p = answer.priority === reference.priority;
  const e = reference.evidenceIds.every((id) => answer.evidenceIds.includes(id)) && answer.evidenceIds.every((id) => reference.evidenceIds.includes(id));
  verdictCorrect += Number(v); priorityCorrect += Number(p); evidenceCorrect += Number(e);
  console.log(`${reference.id}: 类别${v ? '一致' : '有分歧'}，优先级${p ? '一致' : '有分歧'}，证据${e ? '一致' : '有分歧'}`);
}
console.log(`已标注 ${complete}/${gold.length}；类别一致 ${verdictCorrect}/${complete}，优先级一致 ${priorityCorrect}/${complete}，证据一致 ${evidenceCorrect}/${complete}`);
console.log('这是个人标注与参考答案的对比，不是 Agent 模型准确率。分歧需要按证据讨论。');
