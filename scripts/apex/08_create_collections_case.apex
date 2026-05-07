Loan_Agreement__c agreement = [SELECT Id FROM Loan_Agreement__c ORDER BY CreatedDate DESC LIMIT 1];
insert new Collections__c(
    Loan_Agreement__c = agreement.Id
);
