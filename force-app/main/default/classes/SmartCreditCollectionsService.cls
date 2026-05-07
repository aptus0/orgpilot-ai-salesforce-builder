public with sharing class SmartCreditCollectionsService {
    @AuraEnabled(cacheable=true)
    public static String recommendAction(Integer daysPastDue, Decimal delinquentAmount) {
        Integer dpd = daysPastDue == null ? 0 : daysPastDue;
        Decimal amount = delinquentAmount == null ? 0 : delinquentAmount;

        if (dpd >= 120 || amount >= 10000) {
            return 'Escalate to charge-off governance queue';
        }

        if (dpd >= 90) {
            return 'Start final notice and hardship evaluation';
        }

        if (dpd >= 60) {
            return 'Assign recovery specialist and outbound plan';
        }

        if (dpd >= 30) {
            return 'Initiate friendly reminder and payment arrangement';
        }

        return 'No collections action required';
    }
}
