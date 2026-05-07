# SmartCredit 360 Automation Pack

Bu klasör artık SmartCredit 360 template'i için deploy edilebilir Salesforce source iskeleti içerir:

- `force-app/main/default/objects/.../validationRules`
- `force-app/main/default/triggers`
- `force-app/main/default/classes`
- `force-app/main/default/flows`
- `force-app/main/default/lwc`
- `scripts/apex`
- `sfdx-project.json`

## Hazır Otomasyonlar

### Validation Rules

- `Loan_Product__c.APR_Must_Be_Positive`
- `Loan_Application__c.Credit_Pull_Consent_Required`
- `Credit_Analysis__c.FICO_Score_Range`
- `Credit_Analysis__c.Adverse_Action_Code_Required`
- `Collateral__c.Vehicle_Collateral_Requires_VIN`
- `Loan_Agreement__c.Amt_Financed_GT_Fin_Charge`
- `Collections__c.FDCPA_Opt_Out_Assigned_Agent`

### Apex Trigger Katmanı

- `LoanApplicationTrigger`
  - `Application_Channel__c` boşsa `Online` set eder.
  - Applicant consent yoksa `Under Review` veya `Approved` durumuna geçişi bloklar.

- `CreditAnalysisTrigger`
  - Deny / Counter-offer kararlarında `Adverse_Action_Code__c` zorlar.
  - `Adverse_Action_Date__c` boşsa bugünün tarihini doldurur.

- `CollateralTrigger`
  - Vehicle collateral için VIN zorlar.
  - Estimated value negatif/0 girişini bloklar.

- `LoanAgreementTrigger`
  - APR > 0 zorlar.
  - `Amount_Financed__c < Finance_Charge__c` durumunu bloklar.

- `CollectionsTrigger`
  - FDCPA opt-out aktifken agent atamasını bloklar.

### Flow Hazırlık Katmanı

- `SmartCreditFlowActions.cls`
  - Flow Builder'da invocable action olarak kullanılabilir.
  - `Resolve DPD Bucket`

- `SmartCreditAdverseActionFlowActions.cls`
  - `Resolve Adverse Action Date`

### Apex Service Katmanı

- `SmartCreditScoreService`
- `SmartCreditReportService`
- `SmartCreditErrorLogService`
- `SmartCreditComplianceService`
- `SmartCreditCollectionsService`

### Flow Kataloğu

- `SmartCredit_01_Application_Intake`
- `SmartCredit_02_Consent_Compliance_Check`
- `SmartCredit_03_Underwriting_Scorecard`
- `SmartCredit_04_Adverse_Action_Notice`
- `SmartCredit_05_Collateral_Review`
- `SmartCredit_06_Agreement_Boarding`
- `SmartCredit_07_Payment_Schedule_Audit`
- `SmartCredit_08_Collections_Escalation`
- `SmartCredit_09_Fraud_And_KYC_Review`
- `SmartCredit_10_Executive_Exception_Approval`

### LWC

- `smartCredit360Workbench`
  - `lightning__RecordPage`
  - `lightning__AppPage`
  - `lightning__HomePage`
  - `lightning__FlowScreen`
  - Composite score görünümü
  - Findex / FICO rapor özeti
  - Error log paneli

### Anonymous Apex Paketleri

- `scripts/apex/01_seed_loan_products.apex`
- `scripts/apex/02_seed_applicant_account.apex`
- `scripts/apex/03_create_loan_application.apex`
- `scripts/apex/04_create_credit_analysis.apex`
- `scripts/apex/05_create_collateral.apex`
- `scripts/apex/06_create_loan_agreement.apex`
- `scripts/apex/07_create_payment_schedule.apex`
- `scripts/apex/08_create_collections_case.apex`
- `scripts/apex/09_run_scoring_service.apex`
- `scripts/apex/10_generate_report_summary.apex`

## Deploy

Salesforce CLI ile:

```bash
sf project deploy start --source-dir force-app
```

Anonymous Apex çalıştırmak için:

```bash
sf apex run --file scripts/apex/01_seed_loan_products.apex
```

## Sonraki Adımlar

- Permission Set ve FLS katmanını eklemek
- Lightning App Page / FlexiPage metadata üretmek
- Jest testli LWC ve Apex test class'ları eklemek
- Flow dosyalarını `Draft` durumundan tam record-triggered node graph'a çıkarmak
