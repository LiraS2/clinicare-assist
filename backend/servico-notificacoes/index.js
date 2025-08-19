import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'servico-notificacoes',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Endpoint para envio de WhatsApp
app.post('/whatsapp', (req, res) => {
  const { telefone, mensagem } = req.body;
  
  if (!telefone || !mensagem) {
    return res.status(400).json({
      error: 'Telefone e mensagem são obrigatórios'
    });
  }

  res.json({
    message: 'Endpoint para envio de WhatsApp',
    service: 'servico-notificacoes',
    dados: { telefone, mensagem }
  });
});

// Endpoint para envio de email
app.post('/email', (req, res) => {
  const { email, assunto, corpo } = req.body;
  
  if (!email || !assunto || !corpo) {
    return res.status(400).json({
      error: 'Email, assunto e corpo são obrigatórios'
    });
  }

  res.json({
    message: 'Endpoint para envio de email',
    service: 'servico-notificacoes',
    dados: { email, assunto, corpo }
  });
});

// Endpoint para envio de SMS
app.post('/sms', (req, res) => {
  const { telefone, mensagem } = req.body;
  
  if (!telefone || !mensagem) {
    return res.status(400).json({
      error: 'Telefone e mensagem são obrigatórios'
    });
  }

  res.json({
    message: 'Endpoint para envio de SMS',
    service: 'servico-notificacoes',
    dados: { telefone, mensagem }
  });
});

// Endpoint para lembretes de consultas
app.post('/lembrete-consulta', (req, res) => {
  const { pacienteId, tipo, agendamento } = req.body;
  
  if (!pacienteId || !tipo || !agendamento) {
    return res.status(400).json({
      error: 'PacienteId, tipo e agendamento são obrigatórios'
    });
  }

  res.json({
    message: 'Endpoint para envio de lembretes de consulta',
    service: 'servico-notificacoes',
    dados: { pacienteId, tipo, agendamento }
  });
});

// Endpoint para histórico de notificações
app.get('/historico/:pacienteId', (req, res) => {
  const { pacienteId } = req.params;
  
  res.json({
    message: `Histórico de notificações para paciente ${pacienteId}`,
    service: 'servico-notificacoes'
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro no servico-notificacoes:', err);
  res.status(500).json({
    error: 'Erro interno do serviço de notificações'
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada no serviço de notificações'
  });
});

app.listen(PORT, () => {
  console.log(`📢 Serviço de Notificações rodando na porta ${PORT}`);
});