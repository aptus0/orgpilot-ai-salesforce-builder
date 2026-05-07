public with sharing class CollateralTriggerHandler {
    public static void beforeUpsert(List<Collateral__c> newRecords) {
        for (Collateral__c record : newRecords) {
            if (record.Collateral_Type__c == 'Vehicle' && String.isBlank(record.VIN__c)) {
                record.VIN__c.addError('Vehicle collateral icin VIN zorunludur.');
            }

            if (record.Estimated_Value__c != null && record.Estimated_Value__c <= 0) {
                record.Estimated_Value__c.addError('Estimated Value zero veya negatif olamaz.');
            }
        }
    }
}
