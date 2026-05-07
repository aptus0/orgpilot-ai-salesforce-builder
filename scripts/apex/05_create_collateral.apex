Loan_Application__c applicationRecord = [SELECT Id FROM Loan_Application__c ORDER BY CreatedDate DESC LIMIT 1];
insert new Collateral__c(
    Loan_Application__c = applicationRecord.Id,
    Collateral_Type__c = 'Vehicle',
    Estimated_Value__c = 45000,
    VIN__c = '1HGCM82633A123456'
);
