Loan_Agreement__c agreement = [SELECT Id FROM Loan_Agreement__c ORDER BY CreatedDate DESC LIMIT 1];
insert new Collections__c(
    Loan_Agreement__c = agreement.Id,
    Last_Payment_Date__c = Date.today().addDays(-45),
    Delinquent_Amount__c = 1750,
    FDCPA_Opt_Out__c = false
);
