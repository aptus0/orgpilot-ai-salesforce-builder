trigger CreditAnalysisTrigger on Credit_Analysis__c (
    before insert,
    before update
) {
    CreditAnalysisTriggerHandler.beforeUpsert(Trigger.new, Trigger.oldMap);
}
