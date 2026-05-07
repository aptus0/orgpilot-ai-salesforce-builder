public with sharing class SmartCreditErrorLogService {
    public class ErrorLogEntry {
        @AuraEnabled public String severity;
        @AuraEnabled public String area;
        @AuraEnabled public String message;
        @AuraEnabled public Datetime loggedAt;
    }

    @AuraEnabled(cacheable=true)
    public static List<ErrorLogEntry> sampleLogs() {
        List<ErrorLogEntry> logs = new List<ErrorLogEntry>();

        logs.add(buildEntry('INFO', 'Underwriting', 'Credit analysis orchestration initialized.'));
        logs.add(buildEntry('WARN', 'Compliance', 'Applicant missing manual OFAC review evidence.'));
        logs.add(buildEntry('ERROR', 'Collections', 'FDCPA contact attempt blocked by opt-out policy.'));

        return logs;
    }

    private static ErrorLogEntry buildEntry(String severity, String area, String message) {
        ErrorLogEntry entry = new ErrorLogEntry();
        entry.severity = severity;
        entry.area = area;
        entry.message = message;
        entry.loggedAt = System.now();
        return entry;
    }
}
