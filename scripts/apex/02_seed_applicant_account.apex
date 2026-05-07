List<Account> existingApplicants = [
    SELECT Id
    FROM Account
    WHERE Name = 'Taylor Applicant'
    LIMIT 1
];

if (existingApplicants.isEmpty()) {
    insert new Account(
        Name = 'Taylor Applicant',
        Support_Plan_Expiration_Date__c = Date.today().addMonths(12)
    );
}
