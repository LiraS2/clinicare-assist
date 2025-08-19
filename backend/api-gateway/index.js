const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações de segurança
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requisições por IP
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' }
});
app.use(globalLimiter);

// Configuração dos serviços
const services = {
  'servico-usuarios': process.env.SERVICE_USUARIOS_URL || 'http://localhost:3001',
  'servico-laudos': process.env.SERVICE_LAUDOS_URL || 'http://localhost:3002',
  'servico-geracao-pdf': process.env.SERVICE_PDF_URL || 'http://localhost:3003',
  'servico-notificacoes': process.env.SERVICE_NOTIFICACOES_URL || 'http://localhost:3004',
  'servico-assinatura': process.env.SERVICE_ASSINATURA_URL || 'http://localhost:3005'
};

// Mapeamento de rotas protegidas e suas permissões necessárias
const protectedRoutes = {
  // Rotas de laudos
  'POST /api/laudos': ['laudo:criar'],
  'GET /api/laudos': ['laudo:ler'],
  'PUT /api/laudos': ['laudo:editar'],
  'DELETE /api/laudos': ['laudo:excluir'],
  
  // Rotas de pacientes
  'POST /api/pacientes': ['paciente:criar'],
  'GET /api/pacientes': ['paciente:ler'],
  'PUT /api/pacientes': ['paciente:editar'],
  'DELETE /api/pacientes': ['paciente:excluir'],
  
  // Rotas de PDF
  'POST /api/pdf': ['laudo:criar', 'laudo:editar'],
  
  // Rotas de notificações
  'POST /api/notificacoes': ['notificacao:enviar'],
  'GET /api/notificacoes': ['notificacao:ler']
};

// Middleware de autenticação JWT
const authenticateToken = (req, res, next) => {
  // Pular autenticação para rotas públicas
  const publicRoutes = [
    '/health',
    '/api/auth/login',
    '/api/auth/refresh'
  ];

  if (publicRoutes.some(route => req.path.includes(route))) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Token de acesso requerido',
      message: 'Inclua o token no header: Authorization: Bearer <token>'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'clinicare-secret-key', (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token expirado',
          message: 'Faça login novamente ou use o refresh token'
        });
      }
      return res.status(403).json({ 
        error: 'Token inválido',
        message: 'Token JWT malformado ou assinatura inválida'
      });
    }

    req.user = user;
    next();
  });
};

// Middleware de autorização baseado em permissões
const authorizePermissions = (req, res, next) => {
  // Pular autorização para rotas públicas
  const publicRoutes = [
    '/health',
    '/api/auth/login',
    '/api/auth/refresh',
    '/api/auth/me',
    '/api/auth/logout'
  ];

  if (publicRoutes.some(route => req.path.includes(route))) {
    return next();
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  // Verificar permissões necessárias para a rota
  const routeKey = `${req.method} ${req.path}`;
  const routePattern = Object.keys(protectedRoutes).find(pattern => {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(routeKey);
  });

  if (routePattern) {
    const requiredPermissions = protectedRoutes[routePattern];
    const userPermissions = req.user.permissions || [];

    // Verificar se o usuário possui pelo menos uma das permissões necessárias
    const hasPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      console.log(`[AUTH] Acesso negado: ${req.user.email} tentou acessar ${routeKey}`);
      console.log(`[AUTH] Permissões necessárias: ${requiredPermissions.join(', ')}`);
      console.log(`[AUTH] Permissões do usuário: ${userPermissions.join(', ')}`);
      
      return res.status(403).json({ 
        error: 'Permissões insuficientes',
        message: `Esta operação requer uma das seguintes permissões: ${requiredPermissions.join(', ')}`,
        required: requiredPermissions,
        current: userPermissions
      });
    }

    console.log(`[AUTH] Acesso autorizado: ${req.user.email} (${req.user.role}) -> ${routeKey}`);
  }

  next();
};

// Aplicar middlewares de segurança
app.use(authenticateToken);
app.use(authorizePermissions);

// Health check do gateway
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    services: Object.keys(services)
});

// Roteamento para Serviço de Assinatura Digital
app.use('/api/assinatura/*', async (req, res) => {
  const path = req.originalUrl.replace('/api/assinatura', '');
  const targetUrl = `${services['servico-assinatura']}${path}`;
  
  try {
    // Adicionar chave interna para serviços protegidos
    const headers = {
      ...req.headers,
      'x-api-key': process.env.INTERNAL_API_KEY || 'clinicare-internal-key-2024'
    };
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });
    
    const data = await response.text();
    
    // Para PDFs assinados, retornar o buffer diretamente
    if (response.headers.get('content-type')?.includes('application/pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', response.headers.get('content-length'));
      res.setHeader('Content-Disposition', response.headers.get('content-disposition'));
      return res.send(data);
    }
    
    // Para outras respostas JSON
    res.status(response.status);
    if (response.headers.get('content-type')?.includes('application/json')) {
      res.json(JSON.parse(data));
    } else {
      res.send(data);
    }
  } catch (error) {
    console.error('Erro no roteamento para servico-assinatura:', error);
    res.status(500).json({
      error: 'Erro interno no gateway - servico-assinatura indisponível'
    });
  }
});

// Proxy para serviço de usuários
app.use('/api/auth', createProxyMiddleware({
  target: services['servico-usuarios'],
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': '/api/auth'
  },
  onError: (err, req, res) => {
    console.error('[PROXY] Erro no serviço de usuários:', err.message);
    res.status(503).json({ 
      error: 'Serviço de usuários indisponível',
      message: 'Tente novamente em alguns instantes'
    });
  }
}));

app.use('/api/users', createProxyMiddleware({
  target: services['servico-usuarios'],
  changeOrigin: true,
  pathRewrite: {
    '^/api/users': '/api/users'
  },
  onError: (err, req, res) => {
    console.error('[PROXY] Erro no serviço de usuários:', err.message);
    res.status(503).json({ 
      error: 'Serviço de usuários indisponível',
      message: 'Tente novamente em alguns instantes'
    });
  }
}));

// Proxy para serviço de laudos
app.use('/api/laudos', createProxyMiddleware({
  target: services['servico-laudos'],
  changeOrigin: true,
  pathRewrite: {
    '^/api/laudos': '/api/laudos'
  },
  onError: (err, req, res) => {
    console.error('[PROXY] Erro no serviço de laudos:', err.message);
    res.status(503).json({ 
      error: 'Serviço de laudos indisponível',
      message: 'Tente novamente em alguns instantes'
    });
  }
}));

// Proxy para serviço de geração de PDF
app.use('/api/pdf', createProxyMiddleware({
  target: services['servico-geracao-pdf'],
  changeOrigin: true,
  pathRewrite: {
    '^/api/pdf': '/api/pdf'
  },
  onError: (err, req, res) => {
    console.error('[PROXY] Erro no serviço de PDF:', err.message);
    res.status(503).json({ 
      error: 'Serviço de geração de PDF indisponível',
      message: 'Tente novamente em alguns instantes'
    });
  }
}));

// Proxy para serviço de notificações
app.use('/api/notificacoes', createProxyMiddleware({
  target: services['servico-notificacoes'],
  changeOrigin: true,
  pathRewrite: {
    '^/api/notificacoes': '/api/notificacoes'
  },
  onError: (err, req, res) => {
    console.error('[PROXY] Erro no serviço de notificações:', err.message);
    res.status(503).json({ 
      error: 'Serviço de notificações indisponível',
      message: 'Tente novamente em alguns instantes'
    });
  }
}));

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  console.error('[GATEWAY ERROR]', error);
  res.status(500).json({ error: 'Erro interno do gateway' });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Rota não encontrada',
    message: 'Verifique a URL e tente novamente'
  });
});

app.listen(PORT, () => {
  console.log(`🚪 API Gateway rodando na porta ${PORT}`);
  console.log(`🔒 Autenticação JWT ativa`);
  console.log(`📋 Serviços registrados:`, Object.keys(services));
});