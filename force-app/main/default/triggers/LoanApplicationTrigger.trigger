trigger LoanApplicationTrigger on Loan_Application__c (
    before insert,
    before update
) {
    LoanApplicationTriggerHandler.beforeUpsert(Trigger.new);
}
