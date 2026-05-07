# SmartCredit 360 — US Market Salesforce Data Model

Bu model ABD kredi/lending senaryosu için tasarlanmış bir Salesforce metadata template'idir.

## Türkiye vs ABD farkı

| Konu | Türkiye | ABD |
| --- | --- | --- |
| Kimlik | TC Kimlik No | SSN last 4, encrypted |
| Kredi skoru | KKB / Findeks | FICO Score 300–850 |
| Regülatör | BDDK | OCC / CFPB / FDIC |
| Yasal çerçeve | KVKK / Bankacılık Kanunu | TILA / ECOA / FCRA / HMDA / BSA-AML |
| Para birimi | TRY | USD |
| Faiz ifadesi | Faiz oranı | APR |
| Teminat | Tapu / Araç | Real Estate / Vehicle / CD / Securities |
| Gecikme | Tahsilat aşaması | 30 / 60 / 90 DPD / Charge-Off |

## Deploy sırası

1. Account custom fields
2. Loan_Product__c
3. Loan_Application__c
4. Credit_Analysis__c
5. Collateral__c
6. Loan_Agreement__c
7. Payment_Schedule__c
8. Collections__c

## Regülasyon notları

- FCRA: Credit pull consent olmadan kredi raporu/skoru çekilmemeli.
- ECOA: Denial/counter-offer kararları adverse action code/date ile takip edilmeli.
- TILA / Reg Z: APR, finance charge, amount financed disclosure alanları kritik.
- HMDA: Mortgage ürünleri için census tract ve reportable flag gerekir.
- BSA/AML: CIP ve OFAC durumları müşteri seviyesinde izlenir.
- FDCPA: Collections iletişim kısıtları ve opt-out alanı uygulanır.

## Üretim öncesi yapılacaklar

- Field-level security ve permission set oluştur.
- Formula alanlarını gerçek business rule'larla test et.
- Validation rule ekle: FICO 300–850, VIN 17 karakter, required koşulları.
- Audit trail, encryption, data retention ve access logging tasarla.
- Production deploy'u manuel onay/workflow'a bağla.
