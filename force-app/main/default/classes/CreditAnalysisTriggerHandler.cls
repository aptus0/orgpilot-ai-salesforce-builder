public with sharing class CreditAnalysisTriggerHandler {
    public static void beforeUpsert(
        List<Credit_Analysis__c> newRecords,
        Map<Id, Credit_Analysis__c> oldMap
    ) {
        for (Credit_Analysis__c record : newRecords) {
            Boolean isAdverseDecision =
                record.Decision__c == 'Deny' ||
                record.Decision__c == 'Counter-offer';

            if (isAdverseDecision && String.isBlank(record.Adverse_Action_Code__c)) {
                record.Adverse_Action_Code__c.addError(
                    'Denied veya Counter-offer kararlarında adverse action code zorunludur.'
                );
            }

            if (isAdverseDecision && record.Adverse_Action_Date__c == null) {
                record.Adverse_Action_Date__c = Date.today();
            }
        }
    }
}
