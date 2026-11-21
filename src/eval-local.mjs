import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { runLocalAgent } from './agent-local.mjs';
import { evaluateDraft } from './domain.mjs';

const labels = JSON.parse(await readFile(new URL('../data/labels.json', import.meta.url), 'utf8'));
const splits = JSON.parse(await readFile(new URL('../data/splits.json', import.meta.url), 'utf8'));
const args = process.argv.slice(2);
const splitIndex = args.indexOf('--split');
const split = splitIndex >= 0 ? args[splitIndex + 1] : null;
if (splitIndex >= 0) args.splice(splitIndex, 2);
if (split && !splits[split]) throw new Error('未知数据划分；可选 development、teaching、holdout');
const policyReview = args.includes('--policy-review');
const positional = args.filter((arg) => arg !== '--policy-review');
if (split && positional.length) throw new Error('使用 --split 时不要同时指定案例 ID');
const ids = split ? splits[split] : positional.length ? positional.map((id) => id.toUpperCase()) : labels.map((item) => item.id);
const known = new Set(labels.map((item) => item.id));
if (ids.some((id) => !known.has(id))) throw new Error('包含未知案例 ID');

const run = { startedAt: new Date().toISOString(), model: process.env.OLLAMA_MODEL ?? 'qwen3:4b', split: split ?? 'custom_or_all', policyReview, cases: [] };
const hash = async (path) => createHash('sha256').update(await readFile(new URL(path, import.meta.url))).digest('hex');
run.sourceHashes = {
  agent: await hash('./agent-local.mjs'),
  policy: await hash('./policy-review.mjs'),
  findings: await hash('../data/findings.json'),
  labels: await hash('../data/labels.json'),
  splits: await hash('../data/splits.json')
};
for (const id of ids) {
  process.stdout.write(`正在研判 ${id} ... `);
  const start = Date.now();
  try {
    const result = await runLocalAgent(id, { policyReview });
    const submission = result.trace.findLast((item) => item.tool === 'submit_triage_draft' && item.output?.created);
    const rawDraft = submission?.arguments ?? null;
    const draft = submission?.output ?? null;
    const rawEvaluation = rawDraft ? await evaluateDraft(rawDraft) : null;
    const evaluation = draft ? await evaluateDraft(draft) : null;
    const caseResult = { id, latencyMs: Date.now() - start, rawDraft, rawEvaluation, draft, evaluation, trace: result.trace, answer: result.answer, warning: result.warning ?? null, usage: result.usage, promptVersion: result.promptVersion, policyVersion: result.policyVersion };
    run.cases.push(caseResult);
    console.log(draft ? `模型类别${rawEvaluation.verdictCorrect ? '对' : '错'}，系统类别${evaluation.verdictCorrect ? '对' : '错'}，证据${evaluation.evidenceValid ? '有效' : '无效'}` : '未提交草稿');
  } catch (error) {
    run.cases.push({ id, latencyMs: Date.now() - start, error: error.message });
    console.log(`运行失败：${error.message}`);
  }
}

const completed = run.cases.filter((item) => item.evaluation);
run.summary = {
  total: ids.length,
  evaluated: completed.length,
  rawModelVerdictCorrect: completed.filter((item) => item.rawEvaluation.verdictCorrect).length,
  rawModelPriorityCorrect: completed.filter((item) => item.rawEvaluation.priorityCorrect).length,
  verdictCorrect: completed.filter((item) => item.evaluation.verdictCorrect).length,
  priorityCorrect: completed.filter((item) => item.evaluation.priorityCorrect).length,
  evidenceValid: completed.filter((item) => item.evaluation.evidenceValid).length,
  policyChanges: run.cases.filter((item) => item.trace?.some((event) => event.tool === 'policy_review' && event.output.changed)).length,
  toolOrderValid: run.cases.filter((item) => {
    const names = item.trace?.map((event) => event.tool) ?? [];
    return names.indexOf('get_finding') >= 0 && names.indexOf('submit_triage_draft') > names.indexOf('get_finding');
  }).length,
  averageLatencyMs: completed.length ? Math.round(completed.reduce((sum, item) => sum + item.latencyMs, 0) / completed.length) : null,
  failedOrNoDraft: ids.length - completed.length
};
const directory = new URL('../work/runs/', import.meta.url);
await mkdir(directory, { recursive: true });
const filename = `run-${run.startedAt.replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}.json`;
const path = new URL(filename, directory);
await writeFile(path, `${JSON.stringify(run, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ summary: run.summary, savedTo: fileURLToPath(path) }, null, 2));
