Loan_Application__c applicationRecord = [SELECT Id FROM Loan_Application__c ORDER BY CreatedDate DESC LIMIT 1];
insert new Credit_Analysis__c(
    Loan_Application__c = applicationRecord.Id
);
