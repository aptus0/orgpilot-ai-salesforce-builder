public with sharing class SmartCreditComplianceService {
    public class ComplianceCheckResult {
        @AuraEnabled public Boolean passed;
        @AuraEnabled public List<String> findings;
    }

    @AuraEnabled(cacheable=true)
    public static ComplianceCheckResult inspectApplication(
        Boolean creditPullConsent,
        Boolean cipVerified,
        Boolean ofacCleared,
        Decimal ficoScore
    ) {
        ComplianceCheckResult result = new ComplianceCheckResult();
        result.passed = true;
        result.findings = new List<String>();

        if (creditPullConsent != true) {
            result.passed = false;
            result.findings.add('FCRA consent missing.');
        }

        if (cipVerified != true) {
            result.passed = false;
            result.findings.add('CIP verification incomplete.');
        }

        if (ofacCleared != true) {
            result.passed = false;
            result.findings.add('OFAC screening incomplete.');
        }

        if (ficoScore != null && ficoScore < 580) {
            result.findings.add('Sub-prime FICO threshold detected; enhanced review recommended.');
        }

        return result;
    }
}
