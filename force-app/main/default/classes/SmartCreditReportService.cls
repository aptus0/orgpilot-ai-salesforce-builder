public with sharing class SmartCreditReportService {
    public class ReportSummary {
        @AuraEnabled public String bureau;
        @AuraEnabled public String referenceNumber;
        @AuraEnabled public String summary;
        @AuraEnabled public Date reportDate;
    }

    @AuraEnabled(cacheable=true)
    public static ReportSummary buildFindexStyleSummary(
        String applicantName,
        Decimal ficoScore,
        Decimal dtiRatio,
        Decimal ltvRatio
    ) {
        SmartCreditScoreService.ScoreResult score =
            SmartCreditScoreService.calculateScore(ficoScore, dtiRatio, ltvRatio);

        ReportSummary summary = new ReportSummary();
        summary.bureau = 'SmartCredit 360 / FICO-Findex Bridge';
        summary.referenceNumber = 'SCR-' + String.valueOf(DateTime.now().getTime());
        summary.reportDate = Date.today();
        summary.summary =
            applicantName +
            ' icin uretilen raporda skor ' +
            String.valueOf(score.score) +
            ', grade ' +
            score.grade +
            ', yorum: ' +
            score.narrative;
        return summary;
    }
}
