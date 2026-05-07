Loan_Application__c applicationRecord = [SELECT Id FROM Loan_Application__c ORDER BY CreatedDate DESC LIMIT 1];
insert new Credit_Analysis__c(
    Loan_Application__c = applicationRecord.Id,
    FICO_Score__c = 742,
    DTI_Ratio__c = 0.31,
    Collateral_Value_Snapshot__c = 410000,
    Risk_Grade__c = 'A',
    Decision__c = 'Approve'
);
