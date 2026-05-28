function generateApexTestMethod(apexCode, classNameInput) {
  if (!apexCode || !apexCode.trim()) {
    return "Please paste an Apex method or class code first.";
  }

  const className = classNameInput && classNameInput.trim()
    ? classNameInput.trim()
    : detectClassName(apexCode) || "YourClassName";

  const methodInfo = detectFirstMethod(apexCode);

  if (!methodInfo) {
    return `Could not detect a public/static Apex method.

Please paste a method like:

public static void updateCaseStatus(Id caseId) {
    // logic
}`;
  }

  const methodName = methodInfo.name;
  const params = methodInfo.params;

  const testData = buildTestDataFromParams(params);
  const methodCall = buildMethodCall(className, methodName, params);

  return `@isTest
private class ${className}Test {

    @testSetup
    static void setupTestData() {
${testData.setup}
    }

    @isTest
    static void test${capitalize(methodName)}_Success() {
${testData.fetch}

        Test.startTest();
        ${methodCall}
        Test.stopTest();

        // TODO: Add meaningful assertions based on expected output.
        // Example:
        // System.assertNotEquals(null, result, 'Result should not be null');
        System.assert(true, 'Test executed successfully');
    }

    @isTest
    static void test${capitalize(methodName)}_NegativeScenario() {
        Test.startTest();

        try {
            ${buildNegativeMethodCall(className, methodName, params)}
            System.assert(true, 'Method handled negative scenario');
        } catch (Exception e) {
            System.assertNotEquals(null, e.getMessage(), 'Exception message should be available');
        }

        Test.stopTest();
    }
}`;
}

function detectClassName(code) {
  const match = code.match(/\b(?:public|private|global|with sharing|without sharing|inherited sharing|\s)*\s*class\s+([A-Za-z_][A-Za-z0-9_]*)/);
  return match ? match[1] : null;
}

function detectFirstMethod(code) {
  const methodRegex = /\b(public|private|global|protected)\s+(static\s+)?(?:[\w<>,\s]+)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/;
  const match = code.match(methodRegex);

  if (!match) {
    return null;
  }

  const name = match[3];
  const rawParams = match[4].trim();

  const params = rawParams
    ? rawParams.split(",").map((param) => {
        const cleaned = param.trim().replace(/\s+/g, " ");
        const parts = cleaned.split(" ");
        const paramName = parts[parts.length - 1];
        const paramType = parts.slice(0, parts.length - 1).join(" ");

        return {
          type: paramType,
          name: paramName
        };
      })
    : [];

  return {
    name,
    params
  };
}

function buildTestDataFromParams(params) {
  let setupLines = [];
  let fetchLines = [];
  let createdObjects = new Set();

  const needsAccount = params.some((p) =>
    /accountid/i.test(p.name) || /^account$/i.test(p.type)
  );

  const needsContact = params.some((p) =>
    /contactid/i.test(p.name) || /^contact$/i.test(p.type)
  );

  const needsCase = params.some((p) =>
    /caseid/i.test(p.name) || /^case$/i.test(p.type)
  );

  const needsOpportunity = params.some((p) =>
    /opportunityid/i.test(p.name) || /^opportunity$/i.test(p.type)
  );

  if (needsAccount || needsContact || needsOpportunity) {
    setupLines.push(`        Account testAccount = new Account(
            Name = 'Test Account'
        );
        insert testAccount;`);
    createdObjects.add("Account");

    fetchLines.push(`        Account testAccount = [
            SELECT Id, Name
            FROM Account
            LIMIT 1
        ];`);
  }

  if (needsContact) {
    setupLines.push(`

        Contact testContact = new Contact(
            LastName = 'Test Contact',
            AccountId = testAccount.Id
        );
        insert testContact;`);
    createdObjects.add("Contact");

    fetchLines.push(`

        Contact testContact = [
            SELECT Id, LastName, AccountId
            FROM Contact
            LIMIT 1
        ];`);
  }

  if (needsCase) {
    setupLines.push(`        Case testCase = new Case(
            Subject = 'Test Case',
            Status = 'New',
            Origin = 'Phone'
        );
        insert testCase;`);
    createdObjects.add("Case");

    fetchLines.push(`        Case testCase = [
            SELECT Id, Subject, Status, Origin
            FROM Case
            LIMIT 1
        ];`);
  }

  if (needsOpportunity) {
    setupLines.push(`

        Opportunity testOpportunity = new Opportunity(
            Name = 'Test Opportunity',
            StageName = 'Prospecting',
            CloseDate = Date.today().addDays(30),
            AccountId = testAccount.Id
        );
        insert testOpportunity;`);
    createdObjects.add("Opportunity");

    fetchLines.push(`

        Opportunity testOpportunity = [
            SELECT Id, Name, StageName, CloseDate, AccountId
            FROM Opportunity
            LIMIT 1
        ];`);
  }

  if (setupLines.length === 0) {
    setupLines.push(`        // TODO: Create test data required by your method.
        Account testAccount = new Account(
            Name = 'Test Account'
        );
        insert testAccount;`);
  }

  if (fetchLines.length === 0) {
    fetchLines.push(`        // TODO: Fetch or create records needed for this test.`);
  }

  return {
    setup: setupLines.join("\n"),
    fetch: fetchLines.join("\n")
  };
}

function buildMethodCall(className, methodName, params) {
  const args = params.map((param) => getPositiveArgForParam(param)).join(", ");
  return `${className}.${methodName}(${args});`;
}

function buildNegativeMethodCall(className, methodName, params) {
  const args = params.map((param) => getNegativeArgForParam(param)).join(", ");
  return `${className}.${methodName}(${args});`;
}

function getPositiveArgForParam(param) {
  const type = param.type.toLowerCase();
  const name = param.name.toLowerCase();

  if (type === "id" || name.endsWith("id")) {
    if (name.includes("case")) return "testCase.Id";
    if (name.includes("account")) return "testAccount.Id";
    if (name.includes("contact")) return "testContact.Id";
    if (name.includes("opportunity")) return "testOpportunity.Id";
    return "testAccount.Id";
  }

  if (type === "string") return "'Test Value'";
  if (type === "integer") return "1";
  if (type === "decimal") return "10.5";
  if (type === "double") return "10.5";
  if (type === "boolean") return "true";
  if (type === "date") return "Date.today()";
  if (type === "datetime") return "System.now()";

  if (type === "account") return "testAccount";
  if (type === "contact") return "testContact";
  if (type === "case") return "testCase";
  if (type === "opportunity") return "testOpportunity";

  if (type.startsWith("list<")) return "new " + param.type + "()";
  if (type.startsWith("set<")) return "new " + param.type + "()";
  if (type.startsWith("map<")) return "new " + param.type + "()";

  return "null";
}

function getNegativeArgForParam(param) {
  const type = param.type.toLowerCase();

  if (
    type === "string" ||
    type === "id" ||
    type === "date" ||
    type === "datetime" ||
    type === "account" ||
    type === "contact" ||
    type === "case" ||
    type === "opportunity" ||
    type.startsWith("list<") ||
    type.startsWith("set<") ||
    type.startsWith("map<")
  ) {
    return "null";
  }

  if (type === "integer") return "0";
  if (type === "decimal") return "0";
  if (type === "double") return "0";
  if (type === "boolean") return "false";

  return "null";
}

function capitalize(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}