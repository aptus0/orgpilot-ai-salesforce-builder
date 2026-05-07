Loan_Agreement__c agreement = [SELECT Id FROM Loan_Agreement__c ORDER BY CreatedDate DESC LIMIT 1];
insert new Payment_Schedule__c(
    Loan_Agreement__c = agreement.Id,
    Payment_Number__c = 1,
    Due_Date__c = Date.today().addMonths(1),
    Principal__c = 1100,
    Interest__c = 650,
    Remaining_Balance__c = 298900,
    Payment_Status__c = 'Scheduled'
);
