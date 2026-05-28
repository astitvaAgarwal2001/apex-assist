function explainApexError(errorText) {
  if (!errorText || !errorText.trim()) {
    return "Please paste an Apex error message first.";
  }

  const text = errorText.toLowerCase();

  const knownErrors = [
    {
      keywords: ["list has no rows for assignment to sobject"],
      title: "List has no rows for assignment to SObject",
      meaning:
        "Your SOQL query returned zero records, but the code is assigning the result directly to a single SObject.",
      cause:
        "This usually happens when you write something like: Account acc = [SELECT Id FROM Account WHERE Name = 'Test']; and no Account matches the query.",
      fix: `Use a List instead of directly assigning to a single SObject.

Example:

List<Account> accList = [
    SELECT Id, Name
    FROM Account
    WHERE Name = 'Test'
    LIMIT 1
];

if (!accList.isEmpty()) {
    Account acc = accList[0];
}`
    },
    {
      keywords: ["too many soql queries: 101"],
      title: "Too many SOQL queries: 101",
      meaning:
        "Salesforce governor limits allow only a limited number of SOQL queries in one transaction.",
      cause:
        "This usually happens when SOQL is written inside a loop or when multiple methods repeatedly query data.",
      fix: `Move SOQL queries outside loops and use Maps.

Bad:

for (Account acc : accounts) {
    List<Contact> contacts = [
        SELECT Id
        FROM Contact
        WHERE AccountId = :acc.Id
    ];
}

Better:

Set<Id> accountIds = new Set<Id>();

for (Account acc : accounts) {
    accountIds.add(acc.Id);
}

Map<Id, List<Contact>> contactsByAccountId = new Map<Id, List<Contact>>();

for (Contact con : [
    SELECT Id, AccountId
    FROM Contact
    WHERE AccountId IN :accountIds
]) {
    if (!contactsByAccountId.containsKey(con.AccountId)) {
        contactsByAccountId.put(con.AccountId, new List<Contact>());
    }
    contactsByAccountId.get(con.AccountId).add(con);
}`
    },
    {
      keywords: ["too many dml statements: 151"],
      title: "Too many DML statements: 151",
      meaning:
        "Salesforce allows only a limited number of DML statements in one transaction.",
      cause:
        "This usually happens when insert, update, delete, upsert, or undelete is written inside a loop.",
      fix: `Collect records in a List and perform DML once.

Bad:

for (Account acc : accounts) {
    acc.Name = acc.Name + ' Updated';
    update acc;
}

Better:

List<Account> accountsToUpdate = new List<Account>();

for (Account acc : accounts) {
    acc.Name = acc.Name + ' Updated';
    accountsToUpdate.add(acc);
}

if (!accountsToUpdate.isEmpty()) {
    update accountsToUpdate;
}`
    },
    {
      keywords: ["attempt to de-reference a null object", "attempt to de-reference a null object"],
      title: "Attempt to de-reference a null object",
      meaning:
        "Your code is trying to access a field, method, or property on a variable that is currently null.",
      cause:
        "This usually happens when an object, list, map value, or relationship field was expected to have a value but does not.",
      fix: `Add null checks before accessing values.

Example:

if (acc != null) {
    System.debug(acc.Name);
}

For relationship fields:

if (con.Account != null) {
    System.debug(con.Account.Name);
}

For Maps:

if (accountMap.containsKey(accId) && accountMap.get(accId) != null) {
    Account acc = accountMap.get(accId);
}`
    },
    {
      keywords: ["mixed dml operation"],
      title: "Mixed DML Operation",
      meaning:
        "Salesforce does not allow setup objects and non-setup objects to be modified in the same transaction.",
      cause:
        "This often happens when User, PermissionSetAssignment, Group, Queue, or UserRole records are updated along with objects like Account, Contact, Case, or Opportunity.",
      fix: `Move setup-object DML into a separate asynchronous transaction.

Common options:
- @future method
- Queueable Apex
- Separate transaction in test setup

Example:

System.runAs(testUser) {
    // perform business object DML here
}`
    },
    {
      keywords: ["callout from triggers are currently not supported"],
      title: "Callout from triggers are currently not supported",
      meaning:
        "Apex triggers cannot directly perform HTTP callouts.",
      cause:
        "The trigger or trigger handler is trying to make a callout synchronously.",
      fix: `Move the callout to asynchronous Apex.

Example:

public class MyCalloutJob implements Queueable, Database.AllowsCallouts {
    public void execute(QueueableContext context) {
        // perform HTTP callout here
    }
}

Then from trigger/helper:

System.enqueueJob(new MyCalloutJob());`
    },
    {
      keywords: ["uncommitted work pending"],
      title: "You have uncommitted work pending",
      meaning:
        "A callout is being made after DML has already happened in the same transaction.",
      cause:
        "Salesforce generally expects callouts before DML, unless the callout is moved to async Apex.",
      fix: `Avoid doing DML before a callout.

Options:
1. Perform the callout first, then DML.
2. Move the callout to Queueable Apex.
3. Split the process into separate transactions.`
    },
    {
      keywords: ["field_custom_validation_exception"],
      title: "FIELD_CUSTOM_VALIDATION_EXCEPTION",
      meaning:
        "A validation rule blocked your DML operation.",
      cause:
        "The record being inserted or updated does not satisfy one or more validation rules.",
      fix: `Check the full error message to identify the validation rule message.

Common fixes:
- Set all required fields in test data.
- Make sure picklist values are valid.
- Satisfy conditional validation logic.
- Use realistic test data.`
    },
    {
      keywords: ["required_field_missing"],
      title: "REQUIRED_FIELD_MISSING",
      meaning:
        "A required field was missing during insert or update.",
      cause:
        "Your Apex code or test method is creating a record without setting all mandatory fields.",
      fix: `Add the required field before DML.

Example:

Case c = new Case(
    Subject = 'Test Case',
    Status = 'New',
    Origin = 'Phone'
);

insert c;`
    },
    {
      keywords: ["invalid_cross_reference_key"],
      title: "INVALID_CROSS_REFERENCE_KEY",
      meaning:
        "A lookup, master-detail, owner, record type, or related ID is invalid for this operation.",
      cause:
        "This can happen when using a wrong RecordTypeId, OwnerId, Queue Id, or related record Id.",
      fix: `Verify that the referenced ID exists and is valid for the object.

For Record Type:

Id recordTypeId = Schema.SObjectType.Case
    .getRecordTypeInfosByName()
    .get('Your Record Type Name')
    .getRecordTypeId();`
    },
    {
      keywords: ["duplicate_value"],
      title: "DUPLICATE_VALUE",
      meaning:
        "Salesforce found a duplicate value for a field that must be unique.",
      cause:
        "This usually happens with fields marked as Unique or with duplicate rules.",
      fix: `Use unique test data.

Example:

String uniqueValue = 'test_' + System.currentTimeMillis() + '@example.com';`
    }
  ];

  for (const err of knownErrors) {
    const matched = err.keywords.some((keyword) => text.includes(keyword));
    if (matched) {
      return `ERROR: ${err.title}

WHAT IT MEANS:
${err.meaning}

COMMON CAUSE:
${err.cause}

SUGGESTED FIX:
${err.fix}`;
    }
  }

  return `No exact match found for this error.

General debugging checklist:

1. Read the first line of the error carefully.
2. Check the line number mentioned in the stack trace.
3. Verify null checks before accessing object fields.
4. Check whether SOQL or DML is inside a loop.
5. Check whether required fields are missing in test data.
6. Check validation rules and triggers on the object.
7. If this is a test class error, make sure all required test data is created inside the test method or @testSetup method.

Pasted error:

${errorText}`;
}