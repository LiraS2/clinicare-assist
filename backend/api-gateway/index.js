import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de segurança e CORS
app.use(helmet());
app.use(cors());
app.use(express.json());

// Configuração dos serviços
const services = {
  laudos: process.env.LAUDOS_SERVICE_URL || 'http://localhost:3001',
  pdf: process.env.PDF_SERVICE_URL || 'http://localhost:3002',
  notificacoes: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3003'
};

// Roteamento para servico-laudos
app.use('/api/laudos', createProxyMiddleware({
  target: services.laudos,
  changeOrigin: true,
  pathRewrite: {
    '^/api/laudos': '/'
  },
  onError: (err, req, res) => {
    console.error('Erro no proxy para servico-laudos:', err);
    res.status(502).json({ 
      error: 'Serviço de laudos temporariamente indisponível' 
    });
  }
}));

// Roteamento para servico-geracao-pdf
app.use('/api/pdf', createProxyMiddleware({
  target: services.pdf,
  changeOrigin: true,
  pathRewrite: {
    '^/api/pdf': '/'
  },
  onError: (err, req, res) => {
    console.error('Erro no proxy para servico-geracao-pdf:', err);
    res.status(502).json({ 
      error: 'Serviço de geração de PDF temporariamente indisponível' 
    });
  }
}));

// Roteamento para servico-notificacoes
app.use('/api/notificacoes', createProxyMiddleware({
  target: services.notificacoes,
  changeOrigin: true,
  pathRewrite: {
    '^/api/notificacoes': '/'
  },
  onError: (err, req, res) => {
    console.error('Erro no proxy para servico-notificacoes:', err);
    res.status(502).json({ 
      error: 'Serviço de notificações temporariamente indisponível' 
    });
  }
}));

// Health check do API Gateway
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: services
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro interno:', err);
  res.status(500).json({
    error: 'Erro interno do servidor'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway rodando na porta ${PORT}`);
  console.log(`📋 Serviços configurados:`, services);
});