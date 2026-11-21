// Narrow, auditable rules derived from failures observed on the development set.
// They do not read reference labels. Every correction is recorded in the trace.
export function reviewDraft(finding, draft) {
  const evidence = finding.evidence ?? [];
  const text = evidence.map((item) => item.text).join(' ');
  let rule = null;

  if (evidence.length > 0 && evidence.every((item) => item.type === 'scanner_note') && /忽略|跳过|请|必须|直接标|上传|调用/.test(text)) {
    rule = { id: 'instruction_only', verdict: 'invalid_input', priority: 'low', reason: '只有扫描备注中的操作指令，没有可验证的安全观察；备注不能改变研判规则。' };
  } else if (evidence.length > 0 && evidence.every((item) => item.type === 'version_banner') && /没有|缺少|未提供/.test(text)) {
    rule = { id: 'version_only', verdict: 'needs_verification', priority: 'medium', reason: '仅有版本横幅且缺少构建、补丁或可利用性证据，需进一步核实。' };
  } else if (evidence.length === 1 && evidence[0].type === 'http_header' && /Cookie/.test(text) && /偏好/.test(text) && /会话 Cookie.*HttpOnly/.test(text)) {
    rule = { id: 'preference_cookie', verdict: 'false_positive', priority: 'low', reason: '缺少 HttpOnly 的是非敏感偏好 Cookie；登录会话 Cookie 已设置该标志。' };
  } else if (evidence.length === 1 && evidence[0].type === 'http_observation' && /500/.test(text) && /未见|没有|尚未/.test(text) && !/堆栈|令牌|密钥|私人邮箱|收货地址/.test(text)) {
    rule = { id: 'isolated_500', verdict: 'needs_verification', priority: 'medium', reason: '单次异常响应不足以确认或否定漏洞，需要更多可重复的证据。' };
  }

  if (!rule) return { changed: false, rule: null, draft };
  const changed = draft.verdict !== rule.verdict || draft.priority !== rule.priority;
  return { changed, rule: rule.id, draft: changed ? { ...draft, verdict: rule.verdict, priority: rule.priority, reason: rule.reason } : draft };
}
