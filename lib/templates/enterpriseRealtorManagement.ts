import type { SalesforceModelSchema } from "@/lib/types/schema";

export function enterpriseRealtorManagementModel(): SalesforceModelSchema {
  return {
    modelName: "Enterprise Realtor Management Data Model",
    modelApiName: "Enterprise_Realtor_Management_App",
    industry: "Real Estate / Property Management",
    market: "GLOBAL",
    description:
      "Kapsamlı emlak yönetimi, satış/kiralama, müşteri (Buyer), danışman (Realtor) eşleştirmeleri ve hata loglama mimarisi için kurumsal Salesforce veri modeli.",
    deployOrder: [
      "Location__c",
      "Manager__c",
      "Property__c",
      "Buyer__c",
      "Realtor__c",
      "Property_Buyer__c",
      "Property_Realtor__c",
      "Error_Log__c"
    ],
    objects: [
      {
        objectLabel: "Location",
        objectPluralLabel: "Locations",
        objectApiName: "Location__c",
        description: "Emlak ve mülk lokasyonlarının API destekli doğrulandığı merkez obje.",
        isStandardObject: false,
        nameField: { label: "Location Name", type: "Text" },
        sharingModel: "Read",
        deploymentStatus: "Deployed",
        enableReports: true,
        enableSearch: true,
        fields: [
          { label: "Street", apiName: "Street__c", type: "LongTextArea", visibleLines: 3 },
          { label: "City", apiName: "City__c", type: "Text", length: 40, required: true },
          { label: "State", apiName: "State__c", type: "LongTextArea", visibleLines: 2 },
          { label: "Postal Code", apiName: "Postal_Code__c", type: "Text", length: 20, required: true },
          {
            label: "Country",
            apiName: "Country__c",
            type: "Picklist",
            required: true,
            values: ["USA", "Germany", "China", "UK", "Australia", "New Zealand", "Finland"]
          },
          { label: "Land Mark", apiName: "Land_Mark__c", type: "LongTextArea", visibleLines: 3 },
          { label: "Verified", apiName: "Verified__c", type: "Checkbox", defaultValue: false }
        ]
      },
      {
        objectLabel: "Manager",
        objectPluralLabel: "Managers",
        objectApiName: "Manager__c",
        description: "Sistem yöneticileri ve operasyon sorumluları.",
        isStandardObject: false,
        nameField: { label: "Manager Name", type: "Text" },
        sharingModel: "Read",
        deploymentStatus: "Deployed",
        enableReports: true,
        enableSearch: true,
        fields: [
          { label: "Email", apiName: "Email__c", type: "Email", required: true },
          { label: "Alternative Email", apiName: "Alternative_Email__c", type: "Email" },
          { label: "Phone", apiName: "Phone__c", type: "Phone", required: true },
          { label: "Alternative Phone", apiName: "Alternative_Phone__c", type: "Phone" },
          { label: "Location", apiName: "Location__c", type: "Lookup", referenceTo: "Location__c" }
        ]
      },
      {
        objectLabel: "Property",
        objectPluralLabel: "Properties",
        objectApiName: "Property__c",
        description: "Satış, kiralama ve günlük kiralama operasyonlarının kalbi olan mülk objesi.",
        isStandardObject: false,
        nameField: { label: "Property #", type: "AutoNumber", displayFormat: "PROP-{00000}" },
        sharingModel: "ControlledByParent",
        deploymentStatus: "Deployed",
        enableReports: true,
        enableSearch: true,
        fields: [
          { label: "Name", apiName: "Name__c", type: "Text", length: 255, required: true },
          {
            label: "Status",
            apiName: "Status__c",
            type: "Picklist",
            values: ["Prepared", "In Progress", "Completed", "Postponed", "Canceled"]
          },
          { label: "Manager", apiName: "Manager__c", type: "MasterDetail", referenceTo: "Manager__c", required: true },
          { label: "Start Date/Time", apiName: "Start_Date_Time__c", type: "DateTime", required: true },
          { label: "End Date/Time", apiName: "End_Date_Time__c", type: "DateTime" },
          { label: "Location", apiName: "Location__c", type: "Lookup", referenceTo: "Location__c" },
          {
            label: "Location Verified",
            apiName: "Location_Verified__c",
            type: "Formula",
            formula: "Location__r.Verified__c",
            formulaReturnType: "Checkbox"
          },
          { label: "Prerequisites", apiName: "Prerequisites__c", type: "Checkbox", defaultValue: false },
          { label: "Recurring", apiName: "Recurring__c", type: "Checkbox", defaultValue: false },
          { label: "Property Type", apiName: "Property_Type__c", type: "Picklist", values: ["Rent", "Sell", "Daily Rent"] },
          { label: "Frequency", apiName: "Frequency__c", type: "Picklist", values: ["Yearly", "Monthly", "Daily"] }
        ],
        validationRules: [
          {
            ruleName: "Frequency_Required_If_Recurring",
            errorConditionFormula:
              "OR(AND(Recurring__c = TRUE, ISBLANK(TEXT(Frequency__c))), AND(Recurring__c = FALSE, NOT(ISBLANK(TEXT(Frequency__c)))))",
            errorMessage: "If Recurring is checked, Frequency must be filled. If unchecked, Frequency must be empty."
          },
          {
            ruleName: "Prerequisites_Required_For_Creation",
            errorConditionFormula: "AND(ISNEW(), Prerequisites__c = FALSE)",
            errorMessage: "Prerequisites must be checked to create a new Property."
          },
          {
            ruleName: "End_Date_Must_Be_After_Start_Date",
            errorConditionFormula: "AND(NOT(ISBLANK(End_Date_Time__c)), End_Date_Time__c <= (Start_Date_Time__c + 1))",
            errorMessage: "End Date/Time must be at least 1 day ahead of Start Date/Time."
          },
          {
            ruleName: "Location_Required_If_Sell",
            errorConditionFormula: "AND(ISPICKVAL(Property_Type__c, 'Sell'), ISBLANK(Location__c))",
            errorMessage: "Location must be selected if Property Type is Sell."
          }
        ]
      },
      {
        objectLabel: "Buyer",
        objectPluralLabel: "Buyers",
        objectApiName: "Buyer__c",
        description: "Potansiyel alıcı veya kiralayıcı müşteriler.",
        isStandardObject: false,
        nameField: { label: "Buyer Name", type: "Text" },
        sharingModel: "Private",
        deploymentStatus: "Deployed",
        enableReports: true,
        enableSearch: true,
        fields: [
          { label: "Email", apiName: "Email__c", type: "Email", required: true },
          { label: "Phone", apiName: "Phone__c", type: "Phone", required: true },
          { label: "Company Name", apiName: "Company_Name__c", type: "Text", length: 255 },
          { label: "Location", apiName: "Location__c", type: "Lookup", referenceTo: "Location__c" }
        ]
      },
      {
        objectLabel: "Realtor",
        objectPluralLabel: "Realtors",
        objectApiName: "Realtor__c",
        description: "Satış ve kiralama operasyonlarını yürüten emlak danışmanları.",
        isStandardObject: false,
        nameField: { label: "Realtor Name", type: "Text" },
        sharingModel: "Private",
        deploymentStatus: "Deployed",
        enableReports: true,
        enableSearch: true,
        fields: [
          { label: "Email", apiName: "Email__c", type: "Email", required: true },
          { label: "Phone", apiName: "Phone__c", type: "Phone", required: true },
          { label: "Field of duty", apiName: "Field_of_duty__c", type: "Text", length: 255 }
        ]
      },
      {
        objectLabel: "Property / Buyer",
        objectPluralLabel: "Property / Buyers",
        objectApiName: "Property_Buyer__c",
        description: "Mülk ve alıcı arasındaki junction obje.",
        isStandardObject: false,
        nameField: { label: "Buyer #", type: "AutoNumber", displayFormat: "PB-{00000}" },
        sharingModel: "ControlledByParent",
        enableReports: true,
        fields: [
          { label: "Property", apiName: "Property__c", type: "MasterDetail", referenceTo: "Property__c", required: true },
          { label: "Buyer", apiName: "Buyer__c", type: "MasterDetail", referenceTo: "Buyer__c", required: true }
        ]
      },
      {
        objectLabel: "Property / Realtor",
        objectPluralLabel: "Property / Realtors",
        objectApiName: "Property_Realtor__c",
        description: "Mülk ve danışman arasındaki junction obje.",
        isStandardObject: false,
        nameField: { label: "Property / Realtor #", type: "AutoNumber", displayFormat: "PR-{00000}" },
        sharingModel: "ControlledByParent",
        enableReports: true,
        fields: [
          { label: "Property", apiName: "Property__c", type: "MasterDetail", referenceTo: "Property__c", required: true },
          { label: "Realtor", apiName: "Realtor__c", type: "MasterDetail", referenceTo: "Realtor__c", required: true }
        ],
        validationRules: [
          {
            ruleName: "Realtor_Assignment_Conditions",
            errorConditionFormula:
              "OR(ISBLANK(Property__r.End_Date_Time__c), Property__r.End_Date_Time__c <= NOW(), Property__r.Prerequisites__c = FALSE)",
            errorMessage: "Realtor can only be associated with a Property whose End Date is in the future and Prerequisites is checked."
          }
        ],
        triggers: ["Prevent_Duplicate_Realtor_Booking"]
      },
      {
        objectLabel: "Error Log",
        objectPluralLabel: "Error Logs",
        objectApiName: "Error_Log__c",
        description: "Apex ve sistem süreçlerindeki hata loglarının tutulduğu obje.",
        isStandardObject: false,
        nameField: { label: "Log #", type: "AutoNumber", displayFormat: "LOG-{000000}" },
        sharingModel: "ReadWrite",
        enableReports: true,
        fields: [
          { label: "Log Date/Time", apiName: "Log_Date_Time__c", type: "DateTime" },
          { label: "Log Details", apiName: "Log_Details__c", type: "LongTextArea", length: 32768, visibleLines: 8 },
          { label: "Process Name", apiName: "Process_Name__c", type: "Text", length: 255 },
          { label: "Apex Class Name", apiName: "Apex_Class_Name__c", type: "Text", length: 255 }
        ]
      }
    ],
    businessRulesAndAutomations: [
      {
        code: "VR-PROPERTY-01",
        title: "Property Frequency Rule",
        description: "If Recurring is checked, Frequency must be filled. If unchecked, Frequency must stay empty.",
        objectApiName: "Property__c",
        type: "Validation Rule"
      },
      {
        code: "VR-PROPERTY-02",
        title: "Property Prerequisites Rule",
        description: "If Prerequisites is not checked, a new Property record cannot be created.",
        objectApiName: "Property__c",
        type: "Validation Rule"
      },
      {
        code: "VR-PROPERTY-03",
        title: "Property Date Rule",
        description: "End Date/Time must be at least 1 day later than Start Date/Time when End Date/Time is filled.",
        objectApiName: "Property__c",
        type: "Validation Rule"
      },
      {
        code: "VR-PROPERTY-04",
        title: "Property Sell Location Rule",
        description: "If Property Type is Sell, Location is required.",
        objectApiName: "Property__c",
        type: "Validation Rule"
      },
      {
        code: "VR-PROPERTY-REALTOR-01",
        title: "Property Realtor Assignment Rule",
        description: "A Realtor can only be assigned to a Property whose End Date is in the future and whose Prerequisites are approved.",
        objectApiName: "Property_Realtor__c",
        type: "Validation Rule"
      },
      {
        code: "APEX-TRG-01",
        title: "Property Realtor Duplicate Booking Prevention",
        description: "Prevents a Realtor from being assigned to more than one Property at the same time or being duplicate-booked.",
        objectApiName: "Property_Realtor__c",
        type: "Apex Trigger"
      },
      {
        code: "DUP-REALTOR-01",
        title: "Realtor Duplicate Rule",
        description: "A second Realtor record with the same Email and Phone cannot be created.",
        objectApiName: "Realtor__c",
        type: "Duplicate Rule"
      },
      {
        code: "DUP-BUYER-01",
        title: "Buyer Duplicate Rule",
        description: "A second Buyer record with the same Name, Email, and Phone cannot be created.",
        objectApiName: "Buyer__c",
        type: "Duplicate Rule"
      },
      {
        code: "DUP-MANAGER-01",
        title: "Manager Duplicate Rule",
        description: "A second Manager record with the same Email and Phone cannot be created.",
        objectApiName: "Manager__c",
        type: "Duplicate Rule"
      }
    ]
  };
}
