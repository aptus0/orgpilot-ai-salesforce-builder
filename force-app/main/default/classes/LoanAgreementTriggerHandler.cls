public with sharing class LoanAgreementTriggerHandler {
    public static void beforeUpsert(List<Loan_Agreement__c> newRecords) {
        for (Loan_Agreement__c record : newRecords) {
            if (record.APR__c != null && record.APR__c <= 0) {
                record.APR__c.addError('Loan Agreement APR sifirdan buyuk olmalidir.');
            }

            if (
                record.Amount_Financed__c != null &&
                record.Finance_Charge__c != null &&
                record.Amount_Financed__c < record.Finance_Charge__c
            ) {
                record.Amount_Financed__c.addError(
                    'Amount Financed, Finance Charge tutarindan dusuk olamaz.'
                );
            }
        }
    }
}
