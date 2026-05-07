import type { SalesforceModelSchema } from "@/lib/types/schema";

export function smartCredit360Model(): SalesforceModelSchema {
  return {
    modelName: "SmartCredit 360 — US Lending Data Model",
    modelApiName: "SmartCredit_360_US",
    industry: "Financial Services / Lending",
    market: "US",
    aiProvider: "fallback",
    description:
      "ABD kredi/loan origination, underwriting, agreement, payment schedule, collateral ve collections süreçleri için Salesforce veri modeli. Bu template eğitim/dev amaçlıdır; üretim uyumu için hukuk/compliance onayı gerekir.",
    deployOrder: [
      "Account",
      "Loan_Product__c",
      "Loan_Application__c",
      "Credit_Analysis__c",
      "Collateral__c",
      "Loan_Agreement__c",
      "Payment_Schedule__c",
      "Collections__c"
    ],
    complianceRules: [
      {
        code: "FCRA-CONSENT",
        title: "Credit pull consent",
        description:
          "Kredi skoru/raporu çekmeden önce açık rıza alanı ve audit trail gerekir.",
        objectApiName: "Account",
        fieldApiName: "Credit_Pull_Consent__c",
        severity: "critical"
      },
      {
        code: "BSA-AML-CIP",
        title: "Customer Identification Program",
        description:
          "CIP doğrulaması ve OFAC screening sonuçları müşteri seviyesinde izlenmelidir.",
        objectApiName: "Account",
        severity: "critical"
      },
      {
        code: "TILA-REG-Z",
        title: "APR and disclosure fields",
        description:
          "APR, finance charge ve amount financed alanları TILA/Reg Z disclosure sürecinde kritik alanlardır.",
        objectApiName: "Loan_Agreement__c",
        severity: "critical"
      },
      {
        code: "ECOA-AA-NOTICE",
        title: "Adverse action tracking",
        description:
          "Denied/counter-offer kararlarında adverse action code/date tutulmalı ve notice süreci tetiklenmelidir.",
        objectApiName: "Credit_Analysis__c",
        severity: "critical"
      },
      {
        code: "HMDA-MORTGAGE",
        title: "HMDA reportable mortgage fields",
        description:
          "Mortgage ürünleri için HMDA reportable bayrağı, census tract ve ilgili raporlama alanları gerekir.",
        severity: "warning"
      },
      {
        code: "FDCPA-COMMUNICATION",
        title: "Collections contact restrictions",
        description:
          "FDCPA opt-out/iletişim kısıtları collections süreçlerinde dikkate alınmalıdır.",
        objectApiName: "Collections__c",
        fieldApiName: "FDCPA_Opt_Out__c",
        severity: "critical"
      }
    ],
    objects: [
      {
        objectLabel: "Account",
        objectPluralLabel: "Accounts",
        objectApiName: "Account",
        isStandardObject: true,
        description: "Standard Account üzerine SmartCredit 360 KYC/AML/FCRA custom alanları.",
        nameField: { label: "Account Name", type: "Text" },
        sharingModel: "ReadWrite",
        enableActivities: true,
        enableReports: true,
        enableSearch: true,
        fields: [
          {
            label: "SSN Last 4",
            apiName: "SSN_Last4__c",
            type: "EncryptedText",
            length: 4,
            maskType: "lastFour",
            maskChar: "asterisk",
            description: "Only last 4 digits of SSN. Never store full SSN in this field.",
            helpText: "KYC için SSN son 4 hane; full SSN saklama.",
            complianceTags: ["KYC", "FCRA", "PII"]
          },
          {
            label: "Date of Birth",
            apiName: "Date_of_Birth__c",
            type: "Date",
            description: "ECOA / identity verification support field.",
            complianceTags: ["ECOA", "KYC"]
          },
          {
            label: "Annual Income",
            apiName: "Annual_Income__c",
            type: "Currency",
            precision: 18,
            scale: 2,
            description: "Applicant declared/verifiable annual income in USD.",
            complianceTags: ["Ability-to-Repay"]
          },
          {
            label: "Employment Status",
            apiName: "Employment_Status__c",
            type: "Picklist",
            values: ["Employed", "Self-Employed", "Retired", "Student", "Unemployed", "Other"],
            complianceTags: ["ECOA"]
          },
          {
            label: "CIP Verified",
            apiName: "CIP_Verified__c",
            type: "Checkbox",
            defaultValue: false,
            description: "BSA/AML Customer Identification Program verification completed.",
            complianceTags: ["BSA/AML", "CIP"]
          },
          {
            label: "OFAC Cleared",
            apiName: "OFAC_Cleared__c",
            type: "Checkbox",
            defaultValue: false,
            description: "Sanctions screening cleared.",
            complianceTags: ["OFAC", "BSA/AML"]
          },
          {
            label: "Credit Pull Consent",
            apiName: "Credit_Pull_Consent__c",
            type: "Checkbox",
            defaultValue: false,
            description: "Applicant consent for credit pull under FCRA.",
            complianceTags: ["FCRA"]
          }
        ]
      },
      {
        objectLabel: "Loan Product",
        objectPluralLabel: "Loan Products",
        objectApiName: "Loan_Product__c",
        description: "US lending product catalog with APR/Reg Z and HMDA flags.",
        nameField: { label: "Product Name", type: "Text" },
        sharingModel: "ReadWrite",
        enableActivities: true,
        enableReports: true,
        enableSearch: true,
        fields: [
          {
            label: "Product Type",
            apiName: "Product_Type__c",
            type: "Picklist",
            required: true,
            values: ["Mortgage", "Auto", "Personal", "HELOC", "SBA"]
          },
          {
            label: "APR",
            apiName: "APR__c",
            type: "Percent",
            precision: 6,
            scale: 3,
            required: true,
            description: "Annual Percentage Rate. Reg Z disclosure critical field.",
            complianceTags: ["TILA", "Reg Z"]
          },
          {
            label: "HMDA Reportable",
            apiName: "HMDA_Reportable__c",
            type: "Checkbox",
            defaultValue: false,
            description: "True for HMDA-reportable mortgage products.",
            complianceTags: ["HMDA"]
          },
          {
            label: "Max Term Months",
            apiName: "Max_Term_Months__c",
            type: "Number",
            precision: 5,
            scale: 0
          },
          {
            label: "Max Amount",
            apiName: "Max_Amount__c",
            type: "Currency",
            precision: 18,
            scale: 2
          }
        ]
      },
      {
        objectLabel: "Loan Application",
        objectPluralLabel: "Loan Applications",
        objectApiName: "Loan_Application__c",
        description: "Main loan origination application object.",
        nameField: { label: "Application Number", type: "AutoNumber", displayFormat: "APP-{00000}" },
        sharingModel: "Private",
        enableActivities: true,
        enableReports: true,
        enableSearch: true,
        fields: [
          {
            label: "Applicant",
            apiName: "Applicant__c",
            type: "Lookup",
            required: true,
            referenceTo: "Account",
            relationshipLabel: "Loan Applications",
            relationshipName: "Loan_Applications"
          },
          {
            label: "Loan Product",
            apiName: "Loan_Product__c",
            type: "Lookup",
            required: true,
            referenceTo: "Loan_Product__c",
            relationshipLabel: "Loan Applications",
            relationshipName: "Loan_Applications"
          },
          {
            label: "Requested Amount",
            apiName: "Requested_Amount__c",
            type: "Currency",
            precision: 18,
            scale: 2,
            required: true
          },
          {
            label: "Term Months",
            apiName: "Term_Months__c",
            type: "Number",
            precision: 5,
            scale: 0,
            required: true
          },
          {
            label: "Monthly Debt",
            apiName: "Monthly_Debt__c",
            type: "Currency",
            precision: 18,
            scale: 2,
            description: "Supporting field for DTI calculation. Confirm source/verification before production use."
          },
          {
            label: "Status",
            apiName: "Status__c",
            type: "Picklist",
            required: true,
            values: ["Draft", "Under Review", "Approved", "Denied", "Withdrawn"]
          },
          {
            label: "DTI Ratio",
            apiName: "DTI_Ratio__c",
            type: "Formula",
            formulaReturnType: "Percent",
            precision: 6,
            scale: 2,
            formula:
              "IF(Applicant__r.Annual_Income__c > 0, Monthly_Debt__c / (Applicant__r.Annual_Income__c / 12), 0)",
            formulaTreatBlanksAs: "BlankAsZero",
            complianceTags: ["CFPB", "Ability-to-Repay"]
          },
          {
            label: "ECOA Code",
            apiName: "ECOA_Code__c",
            type: "Picklist",
            values: ["1-Approved", "2-Denied", "3-Incomplete", "4-Withdrawn"],
            complianceTags: ["ECOA"]
          },
          {
            label: "Application Channel",
            apiName: "Application_Channel__c",
            type: "Picklist",
            values: ["Branch", "Online", "Mobile", "Phone"]
          }
        ]
      },
      {
        objectLabel: "Credit Analysis",
        objectPluralLabel: "Credit Analyses",
        objectApiName: "Credit_Analysis__c",
        description: "Underwriting and adverse-action tracking object.",
        nameField: { label: "Analysis Number", type: "AutoNumber", displayFormat: "CA-{00000}" },
        sharingModel: "ControlledByParent",
        enableActivities: true,
        enableReports: true,
        enableSearch: true,
        fields: [
          {
            label: "Loan Application",
            apiName: "Loan_Application__c",
            type: "MasterDetail",
            required: true,
            referenceTo: "Loan_Application__c",
            relationshipLabel: "Credit Analyses",
            relationshipName: "Credit_Analyses",
            reparentableMasterDetail: false
          },
          {
            label: "FICO Score",
            apiName: "FICO_Score__c",
            type: "Number",
            precision: 3,
            scale: 0,
            description: "Expected range: 300–850. Add validation rule in production.",
            complianceTags: ["FCRA"]
          },
          {
            label: "DTI Ratio",
            apiName: "DTI_Ratio__c",
            type: "Percent",
            precision: 6,
            scale: 2,
            description: "CFPB ability-to-repay review field. Business rules may vary by product."
          },
          {
            label: "Collateral Value Snapshot",
            apiName: "Collateral_Value_Snapshot__c",
            type: "Currency",
            precision: 18,
            scale: 2,
            description: "Supporting field for LTV formula."
          },
          {
            label: "LTV Ratio",
            apiName: "LTV_Ratio__c",
            type: "Formula",
            formulaReturnType: "Percent",
            precision: 6,
            scale: 2,
            formula:
              "IF(Collateral_Value_Snapshot__c > 0, Loan_Application__r.Requested_Amount__c / Collateral_Value_Snapshot__c, 0)",
            formulaTreatBlanksAs: "BlankAsZero"
          },
          {
            label: "Risk Grade",
            apiName: "Risk_Grade__c",
            type: "Picklist",
            values: ["A", "B", "C", "D", "F"]
          },
          {
            label: "Decision",
            apiName: "Decision__c",
            type: "Picklist",
            values: ["Approve", "Deny", "Counter-offer"]
          },
          {
            label: "Adverse Action Code",
            apiName: "Adverse_Action_Code__c",
            type: "Picklist",
            values: [
              "Insufficient Credit History",
              "High Debt-to-Income Ratio",
              "Delinquent Past or Present Credit Obligations",
              "Collateral Insufficient",
              "Unable to Verify Income",
              "Other"
            ],
            complianceTags: ["ECOA"]
          },
          {
            label: "Adverse Action Date",
            apiName: "Adverse_Action_Date__c",
            type: "Date",
            complianceTags: ["ECOA"]
          }
        ]
      },
      {
        objectLabel: "Collateral",
        objectPluralLabel: "Collateral",
        objectApiName: "Collateral__c",
        description: "Loan collateral / security object.",
        nameField: { label: "Collateral Number", type: "AutoNumber", displayFormat: "COL-{00000}" },
        sharingModel: "ReadWrite",
        enableActivities: true,
        enableReports: true,
        enableSearch: true,
        fields: [
          {
            label: "Loan Application",
            apiName: "Loan_Application__c",
            type: "Lookup",
            required: true,
            referenceTo: "Loan_Application__c",
            relationshipLabel: "Collateral",
            relationshipName: "Collateral_Items"
          },
          {
            label: "Collateral Type",
            apiName: "Collateral_Type__c",
            type: "Picklist",
            required: true,
            values: ["Real Estate", "Vehicle", "CD", "Securities", "Other"]
          },
          {
            label: "Estimated Value",
            apiName: "Estimated_Value__c",
            type: "Currency",
            precision: 18,
            scale: 2,
            required: true
          },
          {
            label: "LTV Ratio",
            apiName: "LTV_Ratio__c",
            type: "Formula",
            formulaReturnType: "Percent",
            precision: 6,
            scale: 2,
            formula:
              "IF(Estimated_Value__c > 0, Loan_Application__r.Requested_Amount__c / Estimated_Value__c, 0)",
            formulaTreatBlanksAs: "BlankAsZero"
          },
          {
            label: "VIN",
            apiName: "VIN__c",
            type: "Text",
            length: 17,
            description: "Vehicle collateral VIN. Add conditional validation when Collateral Type = Vehicle."
          },
          {
            label: "Census Tract",
            apiName: "Census_Tract__c",
            type: "Text",
            length: 30,
            description: "HMDA reporting support field.",
            complianceTags: ["HMDA"]
          }
        ]
      },
      {
        objectLabel: "Loan Agreement",
        objectPluralLabel: "Loan Agreements",
        objectApiName: "Loan_Agreement__c",
        description: "Approved loan agreement and TILA disclosure record.",
        nameField: { label: "Agreement Number", type: "AutoNumber", displayFormat: "LN-{00000}" },
        sharingModel: "ControlledByParent",
        enableActivities: true,
        enableReports: true,
        enableSearch: true,
        fields: [
          {
            label: "Loan Application",
            apiName: "Loan_Application__c",
            type: "MasterDetail",
            required: true,
            referenceTo: "Loan_Application__c",
            relationshipLabel: "Loan Agreements",
            relationshipName: "Loan_Agreements",
            reparentableMasterDetail: false
          },
          {
            label: "First Payment Date",
            apiName: "First_Payment_Date__c",
            type: "Date"
          },
          {
            label: "APR",
            apiName: "APR__c",
            type: "Percent",
            precision: 6,
            scale: 3,
            required: true,
            complianceTags: ["TILA", "Reg Z"]
          },
          {
            label: "Finance Charge",
            apiName: "Finance_Charge__c",
            type: "Currency",
            precision: 18,
            scale: 2,
            complianceTags: ["TILA"]
          },
          {
            label: "Amount Financed",
            apiName: "Amount_Financed__c",
            type: "Currency",
            precision: 18,
            scale: 2,
            complianceTags: ["TILA"]
          },
          {
            label: "Maturity Date",
            apiName: "Maturity_Date__c",
            type: "Formula",
            formulaReturnType: "Date",
            formula: "ADDMONTHS(First_Payment_Date__c, Loan_Application__r.Term_Months__c)",
            formulaTreatBlanksAs: "BlankAsBlank"
          },
          {
            label: "Outstanding Balance",
            apiName: "Outstanding_Balance__c",
            type: "Currency",
            precision: 18,
            scale: 2,
            description:
              "MVP field. In production this can be converted to a roll-up summary or calculated by payment ledger automation."
          },
          {
            label: "Status",
            apiName: "Status__c",
            type: "Picklist",
            values: ["Active", "Paid Off", "Default", "Charged Off"]
          }
        ]
      },
      {
        objectLabel: "Payment Schedule",
        objectPluralLabel: "Payment Schedules",
        objectApiName: "Payment_Schedule__c",
        description: "Amortization/payment schedule rows for a loan agreement.",
        nameField: { label: "Schedule Number", type: "AutoNumber", displayFormat: "PAY-{00000}" },
        sharingModel: "ControlledByParent",
        enableActivities: false,
        enableReports: true,
        enableSearch: true,
        fields: [
          {
            label: "Loan Agreement",
            apiName: "Loan_Agreement__c",
            type: "MasterDetail",
            required: true,
            referenceTo: "Loan_Agreement__c",
            relationshipLabel: "Payment Schedules",
            relationshipName: "Payment_Schedules",
            reparentableMasterDetail: false
          },
          {
            label: "Payment Number",
            apiName: "Payment_Number__c",
            type: "Number",
            precision: 6,
            scale: 0,
            required: true
          },
          {
            label: "Due Date",
            apiName: "Due_Date__c",
            type: "Date",
            required: true
          },
          {
            label: "Principal",
            apiName: "Principal__c",
            type: "Currency",
            precision: 18,
            scale: 2
          },
          {
            label: "Interest",
            apiName: "Interest__c",
            type: "Currency",
            precision: 18,
            scale: 2
          },
          {
            label: "Total Payment",
            apiName: "Total_Payment__c",
            type: "Formula",
            formulaReturnType: "Currency",
            precision: 18,
            scale: 2,
            formula: "Principal__c + Interest__c",
            formulaTreatBlanksAs: "BlankAsZero"
          },
          {
            label: "Remaining Balance",
            apiName: "Remaining_Balance__c",
            type: "Currency",
            precision: 18,
            scale: 2
          },
          {
            label: "Payment Status",
            apiName: "Payment_Status__c",
            type: "Picklist",
            values: ["Scheduled", "Paid", "Late", "Missed"]
          }
        ]
      },
      {
        objectLabel: "Collections",
        objectPluralLabel: "Collections",
        objectApiName: "Collections__c",
        description: "Delinquency and collections tracking.",
        nameField: { label: "Collection Case", type: "AutoNumber", displayFormat: "COLL-{00000}" },
        sharingModel: "ReadWrite",
        enableActivities: true,
        enableReports: true,
        enableSearch: true,
        fields: [
          {
            label: "Loan Agreement",
            apiName: "Loan_Agreement__c",
            type: "Lookup",
            required: true,
            referenceTo: "Loan_Agreement__c",
            relationshipLabel: "Collections",
            relationshipName: "Collections"
          },
          {
            label: "Last Payment Date",
            apiName: "Last_Payment_Date__c",
            type: "Date"
          },
          {
            label: "Days Past Due",
            apiName: "Days_Past_Due__c",
            type: "Formula",
            formulaReturnType: "Number",
            precision: 6,
            scale: 0,
            formula: "TODAY() - Last_Payment_Date__c",
            formulaTreatBlanksAs: "BlankAsBlank"
          },
          {
            label: "DPD Bucket",
            apiName: "DPD_Bucket__c",
            type: "Formula",
            formulaReturnType: "Text",
            formula:
              'IF(TODAY() - Last_Payment_Date__c >= 120, "Charge-Off", IF(TODAY() - Last_Payment_Date__c >= 90, "90DPD", IF(TODAY() - Last_Payment_Date__c >= 60, "60DPD", IF(TODAY() - Last_Payment_Date__c >= 30, "30DPD", "Current"))))',
            formulaTreatBlanksAs: "BlankAsBlank"
          },
          {
            label: "Delinquent Amount",
            apiName: "Delinquent_Amount__c",
            type: "Currency",
            precision: 18,
            scale: 2
          },
          {
            label: "FDCPA Opt Out",
            apiName: "FDCPA_Opt_Out__c",
            type: "Checkbox",
            defaultValue: false,
            complianceTags: ["FDCPA"]
          },
          {
            label: "Assigned Agent",
            apiName: "Assigned_Agent__c",
            type: "Lookup",
            referenceTo: "User",
            relationshipLabel: "Assigned Collections",
            relationshipName: "Assigned_Collections"
          }
        ]
      }
    ]
  };
}
