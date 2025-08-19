# MediConnect - Arquitetura de Microsserviços

## Estrutura do Projeto

```
backend/
├── api-gateway/              # Gateway principal para roteamento
├── servico-laudos/          # Microsserviço para gestão de laudos
├── servico-geracao-pdf/     # Microsserviço para geração de PDFs
├── servico-notificacoes/    # Microsserviço para notificações
├── docker-compose.yml       # Configuração Docker
└── .env.example            # Variáveis de ambiente de exemplo
```

## Microsserviços

### API Gateway (Porta 3000)
- Ponto de entrada único para todas as requisições
- Roteamento para os microsserviços específicos
- Balanceamento de carga e tratamento de erros

### Serviço de Laudos (Porta 3001)
- Gestão completa de laudos médicos
- CRUD de laudos
- Assinatura digital de documentos

### Serviço de Geração de PDF (Porta 3002)
- Conversão de HTML para PDF usando Puppeteer
- Templates personalizáveis para laudos
- Geração de relatórios

### Serviço de Notificações (Porta 3003)
- Envio de WhatsApp via Twilio
- Envio de emails
- Lembretes de consultas
- Histórico de notificações

## Como Executar

### Desenvolvimento Local

1. **Instalar dependências em cada serviço:**
```bash
cd api-gateway && npm install
cd ../servico-laudos && npm install
cd ../servico-geracao-pdf && npm install
cd ../servico-notificacoes && npm install
```

2. **Configurar variáveis de ambiente:**
```bash
cp .env.example .env
# Editar o arquivo .env com suas configurações
```

3. **Executar cada serviço:**
```bash
# Terminal 1 - API Gateway
cd api-gateway && npm run dev

# Terminal 2 - Serviço de Laudos
cd servico-laudos && npm run dev

# Terminal 3 - Serviço de Geração PDF
cd servico-geracao-pdf && npm run dev

# Terminal 4 - Serviço de Notificações
cd servico-notificacoes && npm run dev
```

### Usando Docker

```bash
# Executar todos os serviços
docker-compose up --build

# Executar em background
docker-compose up -d --build
```

## Endpoints Principais

### API Gateway (http://localhost:3000)

#### Health Checks
- `GET /health` - Status do API Gateway
- `GET /api/laudos/health` - Status do serviço de laudos
- `GET /api/pdf/health` - Status do serviço de PDF
- `GET /api/notificacoes/health` - Status do serviço de notificações

#### Laudos
- `GET /api/laudos/laudos` - Listar laudos
- `POST /api/laudos/laudos` - Criar laudo
- `GET /api/laudos/laudos/:id` - Buscar laudo
- `PUT /api/laudos/laudos/:id` - Atualizar laudo
- `DELETE /api/laudos/laudos/:id` - Excluir laudo
- `POST /api/laudos/laudos/:id/assinar` - Assinar laudo

#### Geração de PDF
- `POST /api/pdf/gerar-pdf` - Gerar PDF de laudo
- `POST /api/pdf/html-to-pdf` - Converter HTML para PDF
- `GET /api/pdf/templates` - Listar templates

#### Notificações
- `POST /api/notificacoes/whatsapp` - Enviar WhatsApp
- `POST /api/notificacoes/email` - Enviar email
- `POST /api/notificacoes/sms` - Enviar SMS
- `POST /api/notificacoes/lembrete-consulta` - Enviar lembrete
- `GET /api/notificacoes/historico/:pacienteId` - Histórico

## Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **Puppeteer** - Geração de PDFs
- **Twilio** - WhatsApp e SMS
- **Nodemailer** - Envio de emails
- **Supabase** - Banco de dados
- **Docker** - Containerização

## Próximos Passos

1. Implementar autenticação JWT
2. Configurar Rate Limiting
3. Adicionar monitoramento e logs
4. Implementar cache Redis
5. Configurar CI/CD