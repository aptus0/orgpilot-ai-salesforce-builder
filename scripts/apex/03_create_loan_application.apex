Account applicant = [
    SELECT Id
    FROM Account
    WHERE Name = 'Taylor Applicant'
    ORDER BY CreatedDate DESC
    LIMIT 1
];
Loan_Product__c product = [
    SELECT Id
    FROM Loan_Product__c
    WHERE Name = 'Prime Mortgage 30Y'
    ORDER BY CreatedDate DESC
    LIMIT 1
];
insert new Loan_Application__c(
    Applicant__c = applicant.Id,
    Loan_Product__c = product.Id,
    Requested_Amount__c = 320000,
    Term_Months__c = 240,
    Status__c = 'Draft'
);
