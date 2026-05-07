trigger LoanAgreementTrigger on Loan_Agreement__c (
    before insert,
    before update
) {
    LoanAgreementTriggerHandler.beforeUpsert(Trigger.new);
}
