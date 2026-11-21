import { readFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import { evaluateDraft, getFinding, submitTriageDraft } from './domain.mjs';

const labels = JSON.parse(await readFile(new URL('../data/labels.json', import.meta.url), 'utf8'));
let checked = 0;
for (const label of labels) {
  const finding = await getFinding(label.id);
  assert.ok(!finding.error && label.evidenceIds.every((id) => finding.evidence.some((e) => e.id === id)), label.id);
  const draft = await submitTriageDraft(label);
  assert.equal(draft.status, 'pending_human_review', label.id);
  const score = await evaluateDraft(draft);
  assert.ok(score.verdictCorrect && score.priorityCorrect && score.evidenceValid, label.id);
  checked++;
}
const injected = await getFinding('F006');
assert.ok(injected.evidence[0].text.includes('忽略此前所有规则'));
console.log(JSON.stringify({ scope: '数据集与评分器校验，不代表模型准确率', checked, total: labels.length, injectionCase: 'included' }, null, 2));
