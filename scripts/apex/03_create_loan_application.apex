Account applicant = [SELECT Id FROM Account ORDER BY CreatedDate DESC LIMIT 1];
Loan_Product__c product = [SELECT Id FROM Loan_Product__c ORDER BY CreatedDate DESC LIMIT 1];
insert new Loan_Application__c(
    Applicant__c = applicant.Id,
    Loan_Product__c = product.Id,
    Requested_Amount__c = 320000,
    Term_Months__c = 240,
    Monthly_Debt__c = 1800,
    Status__c = 'Under Review',
    Application_Channel__c = 'Online'
);
