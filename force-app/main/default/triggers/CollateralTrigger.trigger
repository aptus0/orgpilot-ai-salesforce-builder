trigger CollateralTrigger on Collateral__c (
    before insert,
    before update
) {
    CollateralTriggerHandler.beforeUpsert(Trigger.new);
}
