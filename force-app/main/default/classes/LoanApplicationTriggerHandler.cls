public with sharing class LoanApplicationTriggerHandler {
    public static void beforeUpsert(List<Loan_Application__c> newRecords) {
        Set<Id> applicantIds = new Set<Id>();

        for (Loan_Application__c record : newRecords) {
            if (record.Applicant__c != null) {
                applicantIds.add(record.Applicant__c);
            }
        }

        Map<Id, Account> applicantsById = new Map<Id, Account>();
        if (!applicantIds.isEmpty()) {
            applicantsById = new Map<Id, Account>([
                SELECT Id, Credit_Pull_Consent__c
                FROM Account
                WHERE Id IN :applicantIds
            ]);
        }

        for (Loan_Application__c record : newRecords) {
            if (String.isBlank(record.Application_Channel__c)) {
                record.Application_Channel__c = 'Online';
            }

            Boolean complianceReviewState =
                record.Status__c == 'Under Review' ||
                record.Status__c == 'Approved';

            if (!complianceReviewState || record.Applicant__c == null) {
                continue;
            }

            Account applicant = applicantsById.get(record.Applicant__c);
            if (applicant == null || applicant.Credit_Pull_Consent__c != true) {
                record.addError(
                    'Credit Pull Consent olmadan basvuru Under Review veya Approved durumuna gecemez.'
                );
            }
        }
    }
}
