public with sharing class SmartCreditScoreService {
    public class ScoreInput {
        @AuraEnabled public Decimal ficoScore;
        @AuraEnabled public Decimal dtiRatio;
        @AuraEnabled public Decimal ltvRatio;
    }

    public class ScoreResult {
        @AuraEnabled public Decimal score;
        @AuraEnabled public String grade;
        @AuraEnabled public String narrative;
    }

    @AuraEnabled(cacheable=true)
    public static ScoreResult calculateScore(
        Decimal ficoScore,
        Decimal dtiRatio,
        Decimal ltvRatio
    ) {
        Decimal safeFico = ficoScore == null ? 0 : ficoScore;
        Decimal safeDti = dtiRatio == null ? 0 : dtiRatio;
        Decimal safeLtv = ltvRatio == null ? 0 : ltvRatio;

        Decimal normalizedFico = Math.min(100, Math.max(0, (safeFico - 300) / 5.5));
        Decimal dtiPenalty = Math.min(40, safeDti * 100);
        Decimal ltvPenalty = Math.min(35, safeLtv * 100 * 0.35);
        Decimal blended = Math.max(0, Math.min(100, normalizedFico - dtiPenalty - ltvPenalty));

        ScoreResult result = new ScoreResult();
        result.score = blended.setScale(2);

        if (blended >= 80) {
            result.grade = 'A';
            result.narrative = 'Strong credit posture with healthy underwriting indicators.';
        } else if (blended >= 65) {
            result.grade = 'B';
            result.narrative = 'Acceptable risk profile with moderate caution.';
        } else if (blended >= 50) {
            result.grade = 'C';
            result.narrative = 'Elevated risk profile that may require compensating controls.';
        } else if (blended >= 35) {
            result.grade = 'D';
            result.narrative = 'High risk profile; manual review and additional documentation recommended.';
        } else {
            result.grade = 'F';
            result.narrative = 'Critical risk profile; adverse action or restructuring likely required.';
        }

        return result;
    }
}
