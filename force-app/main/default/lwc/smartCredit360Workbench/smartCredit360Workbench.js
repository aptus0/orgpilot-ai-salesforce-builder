import { LightningElement, api } from 'lwc';

export default class SmartCredit360Workbench extends LightningElement {
    @api recordId;
    @api applicantName;
    @api decision;
    @api dtiRatio;
    @api ltvRatio;
    @api ficoScore;
    @api creditPullConsent;
    @api cipVerified;
    @api ofacCleared;
    @api reportReference;
    @api reportSummary;
    @api errorLogs;

    get headline() {
        return this.recordId
            ? `Underwriting cockpit for ${this.recordId}`
            : 'Portable underwriting cockpit for Flow and Record Pages';
    }

    get summary() {
        return 'Reviews compliance posture across FCRA, ECOA, BSA/AML and collections readiness with a compact operator view.';
    }

    get decisionLabel() {
        return this.decision || 'Pending';
    }

    get dtiLabel() {
        return this.formatPercent(this.dtiRatio);
    }

    get ltvLabel() {
        return this.formatPercent(this.ltvRatio);
    }

    get ficoLabel() {
        return this.ficoScore ? `${this.ficoScore}` : 'N/A';
    }

    get checkItems() {
        return [
            this.buildCheck('Credit Pull Consent', this.creditPullConsent),
            this.buildCheck('CIP Verified', this.cipVerified),
            this.buildCheck('OFAC Cleared', this.ofacCleared),
            this.buildCheck('Adverse Action Ready', this.decision !== 'Deny' && this.decision !== 'Counter-offer' ? true : false)
        ];
    }

    get compositeScore() {
        const fico = Number(this.ficoScore || 0);
        const dti = Number(this.dtiRatio || 0);
        const ltv = Number(this.ltvRatio || 0);

        const normalizedFico = Math.min(100, Math.max(0, (fico - 300) / 5.5));
        const dtiPenalty = Math.min(40, dti * 100);
        const ltvPenalty = Math.min(35, ltv * 35);
        const score = Math.max(0, Math.min(100, normalizedFico - dtiPenalty - ltvPenalty));

        return score.toFixed(2);
    }

    get scoreGrade() {
        const score = Number(this.compositeScore);

        if (score >= 80) return 'A';
        if (score >= 65) return 'B';
        if (score >= 50) return 'C';
        if (score >= 35) return 'D';
        return 'F';
    }

    get scoreNarrative() {
        const grade = this.scoreGrade;

        if (grade === 'A') return 'Low-risk borrower profile with strong affordability posture.';
        if (grade === 'B') return 'Stable borrower profile with moderate monitoring needs.';
        if (grade === 'C') return 'Borderline profile; documentation and manual review recommended.';
        if (grade === 'D') return 'High-risk profile; exception committee review advised.';
        return 'Critical risk profile with adverse action likelihood.';
    }

    get logItems() {
        const raw = (this.errorLogs || '')
            .split('\n')
            .map((entry) => entry.trim())
            .filter(Boolean);

        if (raw.length === 0) {
            return [
                {
                    key: 'empty',
                    severity: 'INFO',
                    area: 'Monitoring',
                    message: 'No active underwriting or compliance errors.',
                    className: 'log info'
                }
            ];
        }

        return raw.map((entry, index) => {
            const [severity = 'INFO', area = 'General', ...messageParts] = entry.split('|');
            const message = messageParts.join('|') || 'No details provided.';
            const level = severity.toLowerCase();

            return {
                key: `${index}-${entry}`,
                severity,
                area,
                message,
                className: `log ${level}`
            };
        });
    }

    get logCountLabel() {
        return `${this.logItems.length} entries`;
    }

    get resolvedReportSummary() {
        if (this.reportSummary) {
            return this.reportSummary;
        }

        const applicant = this.applicantName || 'Applicant';
        return `${applicant} icin olusturulan ozet rapor FICO, DTI ve LTV sinyallerini tek ekranda birlestirir.`;
    }

    get resolvedReportReference() {
        return this.reportReference || 'SCR-DEMO-REPORT';
    }

    buildCheck(label, passed) {
        return {
            label,
            value: passed ? 'Ready' : 'Attention',
            className: `check ${passed ? 'pass' : 'warn'}`
        };
    }

    formatPercent(value) {
        if (value === null || value === undefined || value === '') {
            return 'N/A';
        }

        const numeric = Number(value);
        if (Number.isNaN(numeric)) {
            return 'N/A';
        }

        return `${(numeric * 100).toFixed(2)}%`;
    }
}
