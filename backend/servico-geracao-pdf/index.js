import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'servico-geracao-pdf',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Endpoint para gerar PDF de laudo
app.post('/gerar-pdf', (req, res) => {
  res.json({
    message: 'Endpoint para geração de PDF de laudos',
    service: 'servico-geracao-pdf'
  });
});

// Endpoint para gerar PDF de relatório
app.post('/gerar-relatorio', (req, res) => {
  res.json({
    message: 'Endpoint para geração de PDF de relatórios',
    service: 'servico-geracao-pdf'
  });
});

// Endpoint para converter HTML em PDF
app.post('/html-to-pdf', (req, res) => {
  const { html, options } = req.body;
  
  if (!html) {
    return res.status(400).json({
      error: 'HTML é obrigatório para geração do PDF'
    });
  }

  res.json({
    message: 'Endpoint para conversão de HTML em PDF',
    service: 'servico-geracao-pdf',
    received: { html: html.length, options }
  });
});

// Endpoint para status dos templates
app.get('/templates', (req, res) => {
  res.json({
    message: 'Endpoint para listagem de templates disponíveis',
    service: 'servico-geracao-pdf'
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro no servico-geracao-pdf:', err);
  res.status(500).json({
    error: 'Erro interno do serviço de geração de PDF'
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada no serviço de geração de PDF'
  });
});

app.listen(PORT, () => {
  console.log(`📄 Serviço de Geração de PDF rodando na porta ${PORT}`);
});