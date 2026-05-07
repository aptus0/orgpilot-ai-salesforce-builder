public with sharing class CollectionsTriggerHandler {
    public static void beforeUpsert(List<Collections__c> newRecords) {
        for (Collections__c record : newRecords) {
            if (record.FDCPA_Opt_Out__c == true && record.Assigned_Agent__c != null) {
                record.Assigned_Agent__c.addError(
                    'FDCPA Opt Out aktifken otomatik agent atamasi manuel review olmadan yapilamaz.'
                );
            }
        }
    }
}
