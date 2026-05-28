function analyzeApexCode(apexCode) {
  if (!apexCode || !apexCode.trim()) {
    return "Please paste Apex code first.";
  }

  const issues = [];

  const normalizedCode = removeComments(apexCode);
  const loopBlocks = extractLoopBlocks(normalizedCode);

  loopBlocks.forEach((loopBlock, index) => {
    if (containsSOQL(loopBlock.body)) {
      issues.push({
        title: "SOQL query inside loop",
        severity: "High",
        loopNumber: index + 1,
        explanation:
          "A SOQL query was found inside a loop. This can hit the Salesforce governor limit: Too many SOQL queries: 101.",
        suggestion:
          "Move the SOQL query outside the loop. First collect record IDs in a Set, then query once using WHERE Id IN :idSet, and store results in a Map."
      });
    }

    if (containsDML(loopBlock.body)) {
      issues.push({
        title: "DML operation inside loop",
        severity: "High",
        loopNumber: index + 1,
        explanation:
          "A DML operation was found inside a loop. This can hit the Salesforce governor limit: Too many DML statements: 151.",
        suggestion:
          "Add records to a List inside the loop, then perform insert/update/delete once after the loop."
      });
    }
  });

  const hardcodedIds = detectHardcodedSalesforceIds(normalizedCode);

  hardcodedIds.forEach((idValue) => {
    issues.push({
      title: "Hardcoded Salesforce ID",
      severity: "Medium",
      loopNumber: null,
      explanation: `Hardcoded Salesforce ID found: ${idValue}`,
      suggestion:
        "Avoid hardcoding Salesforce IDs because they differ across orgs. Use Custom Metadata, Custom Labels, DeveloperName, or dynamic SOQL."
    });
  });

  if (issues.length === 0) {
    return "No major Apex issues found.\n\nChecked for:\n- SOQL inside loops\n- DML inside loops\n- Hardcoded Salesforce IDs";
  }

  return formatIssues(issues);
}

function removeComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*/g, "");
}

function extractLoopBlocks(code) {
  const loopBlocks = [];
  const loopRegex = /\b(for|while)\s*\([^)]*\)\s*\{/g;

  let match;

  while ((match = loopRegex.exec(code)) !== null) {
    const loopStartIndex = match.index;
    const openingBraceIndex = code.indexOf("{", loopRegex.lastIndex - 1);

    if (openingBraceIndex === -1) {
      continue;
    }

    const closingBraceIndex = findMatchingBrace(code, openingBraceIndex);

    if (closingBraceIndex === -1) {
      continue;
    }

    const body = code.substring(openingBraceIndex + 1, closingBraceIndex);

    loopBlocks.push({
      type: match[1],
      startIndex: loopStartIndex,
      body
    });

    loopRegex.lastIndex = closingBraceIndex + 1;
  }

  return loopBlocks;
}

function findMatchingBrace(code, openingBraceIndex) {
  let depth = 0;

  for (let i = openingBraceIndex; i < code.length; i++) {
    if (code[i] === "{") {
      depth++;
    } else if (code[i] === "}") {
      depth--;

      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

function containsSOQL(codeBlock) {
  return /\[[\s\S]*?\bSELECT\b[\s\S]*?\bFROM\b[\s\S]*?\]/i.test(codeBlock);
}

function containsDML(codeBlock) {
  return /\b(insert|update|delete|upsert|undelete|merge)\b\s+[A-Za-z_][A-Za-z0-9_]*\b/i.test(codeBlock);
}

function detectHardcodedSalesforceIds(code) {
  const idRegex = /['"]([a-zA-Z0-9]{15}|[a-zA-Z0-9]{18})['"]/g;
  const ids = [];
  let match;

  while ((match = idRegex.exec(code)) !== null) {
    ids.push(match[1]);
  }

  return ids;
}

function formatIssues(issues) {
  let output = `${issues.length} issue(s) found:\n\n`;

  issues.forEach((issue, index) => {
    output += `${index + 1}. ${issue.title}\n`;
    output += `Severity: ${issue.severity}\n`;

    if (issue.loopNumber) {
      output += `Location: Loop #${issue.loopNumber}\n`;
    }

    output += `Explanation: ${issue.explanation}\n`;
    output += `Suggestion: ${issue.suggestion}\n\n`;
  });

  return output.trim();
}