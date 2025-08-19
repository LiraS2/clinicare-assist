import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'servico-laudos',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Rotas principais dos laudos
app.get('/laudos', (req, res) => {
  res.json({
    message: 'Endpoint para listagem de laudos',
    service: 'servico-laudos'
  });
});

app.post('/laudos', (req, res) => {
  res.json({
    message: 'Endpoint para criação de laudos',
    service: 'servico-laudos'
  });
});

app.get('/laudos/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    message: `Endpoint para buscar laudo ${id}`,
    service: 'servico-laudos'
  });
});

app.put('/laudos/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    message: `Endpoint para atualizar laudo ${id}`,
    service: 'servico-laudos'
  });
});

app.delete('/laudos/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    message: `Endpoint para excluir laudo ${id}`,
    service: 'servico-laudos'
  });
});

// Endpoint para assinatura digital de laudos
app.post('/laudos/:id/assinar', (req, res) => {
  const { id } = req.params;
  res.json({
    message: `Endpoint para assinatura digital do laudo ${id}`,
    service: 'servico-laudos'
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro no servico-laudos:', err);
  res.status(500).json({
    error: 'Erro interno do serviço de laudos'
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada no serviço de laudos'
  });
});

app.listen(PORT, () => {
  console.log(`📋 Serviço de Laudos rodando na porta ${PORT}`);
});