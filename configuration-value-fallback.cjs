function parseTimeoutAssignments(source) {
  const assignments = new Map();
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(\d+)\s*;?\s*$/);
    if (!match || !/timeout/i.test(match[1]) || !/_seconds$/i.test(match[1])) continue;
    assignments.set(match[1], { value: Number(match[2]), line });
  }
  return assignments;
}

function splitSentences(documentation) {
  return documentation.split(/\r?\n/).flatMap((line) => (
    (line.match(/[^.!?]+[.!?]?/g) ?? [])
      .map((sentence) => sentence.trim())
      .filter(Boolean)
  ));
}

function detectChangedTimeoutValues({
  originalCode,
  updatedCode,
  diff,
  documentation,
}) {
  if ([originalCode, updatedCode, diff, documentation].some((value) => typeof value !== 'string')) {
    return [];
  }

  const originalAssignments = parseTimeoutAssignments(originalCode);
  const updatedAssignments = parseTimeoutAssignments(updatedCode);
  const removedLines = diff.split(/\r?\n/)
    .filter((line) => line.startsWith('-') && !line.startsWith('---'))
    .map((line) => line.slice(1));
  const addedLines = diff.split(/\r?\n/)
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1));
  const findings = [];

  for (const [name, original] of originalAssignments) {
    const updated = updatedAssignments.get(name);
    if (!updated || original.value === updated.value) continue;
    if (!removedLines.includes(original.line) || !addedLines.includes(updated.line)) continue;

    for (const sentence of splitSentences(documentation)) {
      const documentedSeconds = sentence.match(/\b(\d+)\s+seconds?\b/i);
      if (!/\btimeout\b/i.test(sentence)
        || !documentedSeconds
        || Number(documentedSeconds[1]) !== original.value) {
        continue;
      }

      findings.push({
        outdated: true,
        sentence,
        evidenceType: 'added',
        codeEvidence: updated.line,
        reason: `The documented timeout is ${original.value} seconds, but ${name} changed from ${original.value} to ${updated.value} seconds.`,
      });
    }
  }

  return findings;
}

module.exports = { detectChangedTimeoutValues };
