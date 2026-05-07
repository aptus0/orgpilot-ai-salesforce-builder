# OrgPilot AI Pro Architecture

```txt
Next.js UI
  ↓
Template Loader / AI Schema Generator
  ↓
Model Validator & Normalizer
  ↓
Dry Run Deploy Planner
  ↓
Salesforce Metadata API
```

## AI mimarisi

AI doğrudan Salesforce'a yazmaz. AI yalnızca JSON schema üretir. Backend şu adımları uygular:

1. JSON parse
2. Field type whitelist
3. API name normalize
4. Relationship normalize
5. Field count limit
6. Deploy order kontrolü
7. Dry run preview
8. Metadata deploy

## Provider adapter'ları

- `openai`: OpenAI Chat Completions JSON output
- `salesforce-einstein`: Generic Salesforce AI gateway endpoint
- `albert`: Generic external ALBERT/AI endpoint
- `scala-llm`: Kendi Scala LLM service endpoint
- `fallback`: Rule-based schema generator

## Metadata deploy stratejisi

- Standard object ise object oluşturulmaz; sadece `CustomField` oluşturulur.
- Custom object ise önce `CustomObject`, sonra `CustomField` oluşturulur.
- İlişkiler nedeniyle SmartCredit 360 modelinde deploy order sabittir.
