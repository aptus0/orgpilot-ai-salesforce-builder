Loan_Application__c applicationRecord = [SELECT Id FROM Loan_Application__c ORDER BY CreatedDate DESC LIMIT 1];
insert new Loan_Agreement__c(
    Loan_Application__c = applicationRecord.Id,
    APR__c = 0.062
);
