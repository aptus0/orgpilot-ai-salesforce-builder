# Scala LLM Service Skeleton

Bu klasör, OrgPilot AI Pro'nun ileride kendi LLM servisine bağlanması için basit bir Scala HTTP servis iskeletidir.

Gerçek bir LLM'i sıfırdan eğitmek ciddi veri, GPU ve MLOps altyapısı ister. Buradaki yapı ilk etapta:

1. Salesforce schema generation endpoint kontratını sağlar.
2. Rule-based demo cevap üretir.
3. Sonradan fine-tuned model, local inference server veya RAG pipeline ile değiştirilebilir.

## Çalıştırma

```bash
cd scala-llm-service
sbt run
```

Endpoint:

```txt
POST http://localhost:9090/generate-schema
```

Beklenen input:

```json
{
  "objectName": "Loan Application",
  "businessContext": "US lending data model",
  "systemPrompt": "...",
  "provider": "scala-llm"
}
```

Dönen output, Next.js tarafındaki `SalesforceObjectSchema` formatında olmalıdır.
