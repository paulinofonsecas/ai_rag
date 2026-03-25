# Google Gemini API Integration

## Overview

O projeto foi atualizado para usar **Google Gemini Embedding API** em vez de OpenAI. Esta documentação descreve as alterações realizadas e como configurar o ambiente.

## Alterações Realizadas

### 1. **Adapter de Embedding** 
📄 `src/infrastructure/adapters/embedding-api.adapter.ts`

**Mudanças principais:**
- Alterado de OpenAI API para Google Gemini `embedContent` API
- Novo endpoint: `https://generativelanguage.googleapis.com/v1beta/embedContent`
- Modelo padrão: `text-embedding-004` (antes: `text-embedding-3-small`)
- Estrutura de request e response atualizada para formato do Google
- Melhor logging com Logger do NestJS

**Request Format (Google Gemini):**
```json
{
  "model": "models/text-embedding-004",
  "content": {
    "parts": [
      { "text": "seu texto aqui" }
    ]
  }
}
```

### 2. **Configuração**
📄 `src/config/configuration.ts`

**Antes (OpenAI):**
```typescript
embedding: {
  apiKey: process.env.EMBEDDING_API_KEY,
  model: 'text-embedding-3-small',
  baseUrl: 'https://api.openai.com/v1'
}
```

**Depois (Google Gemini):**
```typescript
embedding: {
  apiKey: process.env.EMBEDDING_API_KEY,
  model: 'text-embedding-004' // default
}
```

### 3. **Variáveis de Ambiente**
📄 `.env.example`

**Novo:**
```env
# Google Gemini API Configuration
EMBEDDING_API_KEY=your-google-gemini-api-key-here
EMBEDDING_MODEL=text-embedding-004  # default
```

**Removido:**
- `EMBEDDING_BASE_URL` (não é mais necessário)

## Configuração

### 1. Obter API Key do Google

1. Vá para [Google AI Studio](https://aistudio.google.com/apikey)
2. Clique em "Create API Key"
3. Copie a chave gerada

### 2. Configurar Variáveis de Ambiente

```bash
# PowerShell
$env:EMBEDDING_API_KEY = "sua-chave-aqui"

# Ou no .env local
EMBEDDING_API_KEY=sua-chave-aqui
```

### 3. Modelos Disponíveis

| Modelo | Dimensões | Descrição |
|--------|-----------|-----------|
| `text-embedding-004` | 768 | Último modelo, melhor qualidade |
| `text-embedding-003` | 768 | Modelo anterior |

**Especificar modelo:**
```bash
EMBEDDING_MODEL=text-embedding-004
```

## API REST (Google Gemini Interactions)

A API Interactions do Google oferece uma interface unificada para interagir com modelos Gemini:

### Endpoint
```
POST https://generativelanguage.googleapis.com/v1beta/embedContent?key=YOUR_API_KEY
```

### Request Example
```bash
curl -X POST "https://generativelanguage.googleapis.com/v1beta/embedContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "models/text-embedding-004",
    "content": {
      "parts": [
        {"text": "Hello world"}
      ]
    }
  }'
```

### Response Example
```json
{
  "embedding": {
    "values": [0.1, 0.2, ..., 0.768]
  }
}
```

## Recursos da API Interactions

A API Interactions suporta:
- ✅ **Embeddings**: Conversão de texto para vetores
- ✅ **Text Generation**: Geração de texto
- ✅ **Multimodal Content**: Imagens, áudio, vídeo, documentos
- ✅ **Function Calling**: Chamar ferramentas customizadas
- ✅ **Tool Integration**: Google Search, Maps, Code Execution
- ✅ **Streaming**: Entrega incremental de respostas

### Exemplo de Uso (Python)

```python
from google import genai

client = genai.Client(api_key="YOUR_API_KEY")

interaction = client.interactions.create(
    model="gemini-3-flash-preview",
    input="Tell me a short joke about programming."
)

print(interaction.outputs[-1].text)
```

## Testes

### Executar Testes
```bash
npm test
```

Os testes são agnósticos de provedor (usam mocks), então continuam funcionando sem alterações.

### Teste Manual da Integração

```bash
# Start the app
npm run start:dev

# Ingest a product
npm run playground -- ingest \
  --name "Gaming Laptop" \
  --description "High performance laptop for gaming" \
  --category "electronics"

# Search
npm run playground -- search \
  --query "laptop gaming performance" \
  --limit 5
```

## Troubleshooting

### Erro: "Invalid API Key"
- Verifique se a chave foi copiada corretamente
- Certifique-se que não há espaços extras
- Gere uma nova chave em [Google AI Studio](https://aistudio.google.com/apikey)

### Erro: "Model not found"
- Verifique o nome do modelo (case-sensitive)
- Use `text-embedding-004` ou `text-embedding-003`

### Erro: "Quota exceeded"
- Aguarde antes de fazer mais requisições
- Google Gemini tem rate limits
- Verifique limites em [pricing page](https://ai.google.dev/gemini-api/docs/pricing)

### Cache Local
O adapter mantém cache em memória das últimas embeddings geradas para reduzir requisições à API.

## Performance

### Otimizações Implementadas
1. ✅ Cache em memória de embeddings
2. ✅ Normalização de entrada (reduz requisições duplicadas)
3. ✅ Logging de erros para debugging

### Tempos de Resposta Típicos
- First embedding: ~100-200ms
- Cached embedding: <1ms
- Batch operations: Dependente do batch size

## Próximos Passos

### Possíveis Extensões
- [ ] Usar API Interactions para geração de texto (alternative a tradicional)
- [ ] Integrar Google Search para RAG
- [ ] Usar multimodal embeddings para imagens
- [ ] Implementar streaming para respostas em tempo real

### Documentação Oficial
- [Google Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [Embedding API Reference](https://ai.google.dev/api/embed)
- [API Interactions Docs](https://ai.google.dev/gemini-api/docs/interactions)

## Migração de OpenAI para Google Gemini

### Pontos Importantes
1. **Custo**: Google Gemini é geralmente mais barato
2. **Latência**: Similar ou melhor que OpenAI
3. **Qualidade**: Comparável ou superior
4. **Rate Limits**: Diferentes, consulte preço

### Rollback para OpenAI (se necessário)
Se precisar voltar para OpenAI:

1. Reverter `embedding-api.adapter.ts`
2. Reverter `configuration.ts`
3. Restaurar `EMBEDDING_BASE_URL` em vars de ambiente

```bash
git checkout src/infrastructure/adapters/embedding-api.adapter.ts
git checkout src/config/configuration.ts
```
