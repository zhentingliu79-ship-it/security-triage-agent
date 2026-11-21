import { getFinding, submitTriageDraft, evaluateDraft } from './domain.mjs';
import { runAgent } from './agent.mjs';
import { runLocalAgent } from './agent-local.mjs';

const [mode, id = 'F001'] = process.argv.slice(2);
if (mode === 'demo') {
  const finding = await getFinding(id);
  if (finding.error) throw new Error(finding.error);
  const draft = await submitTriageDraft({ id, verdict: 'needs_verification', priority: 'medium', evidenceIds: [finding.evidence[0].id], reason: '现有证据不足，需要进一步人工核实发现是否成立。' });
  console.log(JSON.stringify({ finding, draft, score: await evaluateDraft(draft), note: '离线固定示例，不代表模型表现。' }, null, 2));
} else if (mode === 'ask') {
  try { console.log(JSON.stringify(await runAgent(id), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
} else if (mode === 'ask-local' || mode === 'ask-local-reviewed') {
  try {
    const result = await runLocalAgent(id, { policyReview: mode === 'ask-local-reviewed' });
    const submission = result.trace.findLast((item) => item.tool === 'submit_triage_draft' && item.output?.created);
    if (submission) {
      result.rawModelEvaluation = await evaluateDraft(submission.arguments);
      result.evaluation = await evaluateDraft(submission.output);
    }
    console.log(JSON.stringify(result, null, 2));
  }
  catch (error) { console.error(error.message); process.exitCode = 1; }
} else console.log('用法: node src/cli.mjs demo F001 | ask F001 | ask-local F001 | ask-local-reviewed F001');
