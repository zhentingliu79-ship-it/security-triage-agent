import { readFile } from 'node:fs/promises';

const data = async (name) => JSON.parse(await readFile(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));

export async function getFinding(id) {
  return (await data('findings')).find((finding) => finding.id === id) ?? { error: 'FINDING_NOT_FOUND', id };
}

export function validateDraft(finding, draft) {
  const verdicts = ['confirmed', 'false_positive', 'needs_verification', 'invalid_input'];
  const priorities = ['high', 'medium', 'low'];
  if (finding.error) return { ok: false, error: finding.error };
  if (!verdicts.includes(draft.verdict) || !priorities.includes(draft.priority)) return { ok: false, error: 'INVALID_LABEL' };
  if (!Array.isArray(draft.evidenceIds) || draft.evidenceIds.length === 0 || !draft.evidenceIds.every((id) => finding.evidence.some((evidence) => evidence.id === id))) return { ok: false, error: 'INVALID_EVIDENCE' };
  if (typeof draft.reason !== 'string' || draft.reason.trim().length < 10) return { ok: false, error: 'REASON_TOO_SHORT' };
  return { ok: true };
}

export async function submitTriageDraft(draft) {
  const finding = await getFinding(draft.id);
  const check = validateDraft(finding, draft);
  if (!check.ok) return { created: false, error: check.error };
  return { created: true, status: 'pending_human_review', ...draft };
}

export async function evaluateDraft(draft) {
  const gold = (await data('labels')).find((label) => label.id === draft.id);
  if (!gold) return { error: 'LABEL_NOT_FOUND' };
  return { verdictCorrect: draft.verdict === gold.verdict, priorityCorrect: draft.priority === gold.priority, evidenceValid: (await getFinding(draft.id)).evidence.some((e) => draft.evidenceIds?.includes(e.id)) };
}
