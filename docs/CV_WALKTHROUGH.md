# CV Walkthrough

Bu doküman, projeyi CV'de, LinkedIn'de veya teknik mülakatta nasıl anlatabileceğin için kısa ama güçlü bir anlatım seti içerir.

## Tek Cümlelik Tanım

AI destekli, compliance-aware Salesforce metadata ve automation accelerator geliştirdim; veri modeli, Apex, LWC, validation rule ve deploy katmanını tek pipeline altında birleştirdim.

## 30 Saniyelik Pitch

Bu projede Salesforce için sadece custom object üreten bir araç değil, uçtan uca bir delivery accelerator inşa ettim. Next.js üzerinden AI destekli schema üretimi yapılıyor, backend bu schema'yı validate edip idempotent şekilde Salesforce'a deploy ediyor. Sonrasında aynı çözüm için `force-app` altında kurumsal source pack üretiyorum: trigger, Apex service, validation rule, flow ve LWC katmanları. Domain olarak da US lending seçtim; bu sayede FCRA, ECOA, TILA, HMDA ve collections kurallarını çözüm tasarımına dahil ettim.

## 2 Dakikalık Teknik Anlatım

Projeyi iki ana akış olarak tasarladım. Birinci akış JSON schema tabanlı metadata deploy engine. Burada en zor kısım Salesforce Metadata API edge case'leriydi: duplicate object/field recovery, master-detail sharing davranışları, formula dependency sıralaması ve retry mantığını çözdüm. İkinci akış Salesforce DX source pack üretimi oldu. `force-app` altında validation rules, Apex trigger/service layer, 10 flow şablonu ve underwriting cockpit olarak çalışan bir LWC bundle oluşturdum. Böylece POC seviyesinden kurumsal delivery seviyesine geçebilen bir yapı çıkardım.

## CV Madde Örnekleri

- Built an AI-assisted Salesforce metadata orchestration platform using Next.js, TypeScript, and jsforce.
- Designed an industry-specific SmartCredit 360 lending template with compliance-aware domain modeling for FCRA, ECOA, TILA, HMDA, and FDCPA workflows.
- Implemented an idempotent Salesforce Metadata API deployment engine with duplicate recovery, phased field deployment, and master-detail sharing edge-case handling.
- Generated deployable Salesforce DX source artifacts including Apex triggers, service classes, validation rules, flow scaffolds, and Lightning Web Components.

## Mülakat Sorularına Hazır Cevaplar

### Bu projedeki en zor teknik konu neydi?

Salesforce Metadata API'nin gerçek hayattaki davranışını idempotent hale getirmekti. Aynı deploy'u ikinci kez çalıştırdığında duplicate object, duplicate field, relationship dependency ve master-detail sharing sorunları çıkıyordu. Bunları create/update/skip fallback ve phased deployment mantığıyla çözdüm.

### Bu projede neden lending domain'i seçtin?

Çünkü lending use case'i salt CRUD değil; compliance, scorecard, underwriting, collateral, collections ve disclosure boyutlarıyla daha gerçekçi ve daha kurumsal bir senaryo sunuyor.

### Bu projeyi büyütmek istesen sıradaki adım ne olurdu?

Flow graph'larını tam record-triggered hale getirmek, permission set/FLS üretmek, Apex test coverage eklemek ve deploy sonrası smoke test pipeline kurmak olurdu.
