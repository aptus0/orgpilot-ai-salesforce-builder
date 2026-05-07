Loan_Application__c applicationRecord = [SELECT Id FROM Loan_Application__c ORDER BY CreatedDate DESC LIMIT 1];
insert new Loan_Agreement__c(
    Loan_Application__c = applicationRecord.Id,
    First_Payment_Date__c = Date.today().addMonths(1),
    APR__c = 0.062,
    Finance_Charge__c = 12500,
    Amount_Financed__c = 300000,
    Status__c = 'Active'
);
