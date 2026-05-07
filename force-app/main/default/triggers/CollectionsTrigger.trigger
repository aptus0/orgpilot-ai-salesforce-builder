trigger CollectionsTrigger on Collections__c (
    before insert,
    before update
) {
    CollectionsTriggerHandler.beforeUpsert(Trigger.new);
}
