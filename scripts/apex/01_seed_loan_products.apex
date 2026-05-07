List<Loan_Product__c> existingProducts = [
    SELECT Id
    FROM Loan_Product__c
    WHERE Name = 'Prime Mortgage 30Y'
    LIMIT 1
];

if (existingProducts.isEmpty()) {
    insert new Loan_Product__c(
        Name = 'Prime Mortgage 30Y',
        Product_Type__c = 'Mortgage',
        APR__c = 0.065
    );
}
