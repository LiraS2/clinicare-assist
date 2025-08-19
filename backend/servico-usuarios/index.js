const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configurações de segurança
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requisições por IP por janela de tempo
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' }
});
app.use('/api/', limiter);

// Rate limiting específico para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas de login por IP
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
});

// Simulação de banco de dados de usuários (em produção, usar banco real)
const users = [
  {
    id: '1',
    email: 'admin@clinicare.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'admin',
    permissions: ['laudo:criar', 'laudo:ler', 'laudo:editar', 'laudo:excluir', 'paciente:criar', 'paciente:ler', 'paciente:editar', 'paciente:excluir', 'usuario:gerenciar'],
    name: 'Administrador',
    active: true
  },
  {
    id: '2',
    email: 'medico@clinicare.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'medico',
    permissions: ['laudo:criar', 'laudo:ler', 'laudo:editar', 'paciente:ler', 'paciente:editar'],
    name: 'Dr. João Silva',
    active: true
  },
  {
    id: '3',
    email: 'secretaria@clinicare.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'secretaria',
    permissions: ['paciente:criar', 'paciente:ler', 'paciente:editar', 'agendamento:criar', 'agendamento:ler', 'agendamento:editar'],
    name: 'Maria Santos',
    active: true
  }
];

// Schemas de validação
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email deve ter um formato válido',
    'any.required': 'Email é obrigatório'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Senha deve ter pelo menos 6 caracteres',
    'any.required': 'Senha é obrigatória'
  })
});

// Utilitários JWT
const generateAccessToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    name: user.name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'clinicare-secret-key', {
    algorithm: 'HS256'
  });
};

const generateRefreshToken = (user) => {
  const payload = {
    id: user.id,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 dias
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'clinicare-refresh-secret', {
    algorithm: 'HS256'
  });
};

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'clinicare-secret-key', (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado' });
      }
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Middleware de autorização
const authorize = (requiredPermissions = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Verificar se o usuário possui todas as permissões necessárias
    const hasPermissions = requiredPermissions.every(permission => 
      req.user.permissions.includes(permission)
    );

    if (!hasPermissions) {
      return res.status(403).json({ 
        error: 'Permissões insuficientes',
        required: requiredPermissions,
        current: req.user.permissions
      });
    }

    next();
  };
};

// Rotas

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'servico-usuarios',
    timestamp: new Date().toISOString()
  });
});

// Login
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    // Validação dos dados de entrada
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: error.details.map(d => d.message)
      });
    }

    const { email, password } = value;

    // Buscar usuário
    const user = users.find(u => u.email === email && u.active);
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Gerar tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Log de segurança
    console.log(`[AUTH] Login realizado com sucesso: ${user.email} (${user.role}) - ${new Date().toISOString()}`);

    res.json({
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 24 * 60 * 60 // 24 horas em segundos
      }
    });

  } catch (error) {
    console.error('[AUTH] Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Refresh token
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token requerido' });
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'clinicare-refresh-secret', (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Refresh token inválido' });
      }

      // Buscar usuário
      const user = users.find(u => u.id === decoded.id && u.active);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Gerar novo access token
      const accessToken = generateAccessToken(user);

      res.json({
        accessToken,
        expiresIn: 24 * 60 * 60
      });
    });

  } catch (error) {
    console.error('[AUTH] Erro no refresh:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar token e retornar informações do usuário
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id && u.active);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: user.permissions
  });
});

// Logout (invalidar token - em produção, manter lista negra de tokens)
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  // Em produção, adicionar token à lista negra
  console.log(`[AUTH] Logout realizado: ${req.user.email} - ${new Date().toISOString()}`);
  res.json({ message: 'Logout realizado com sucesso' });
});

// Listar usuários (apenas para admins)
app.get('/api/users', authenticateToken, authorize(['usuario:gerenciar']), (req, res) => {
  const userList = users
    .filter(u => u.active)
    .map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      permissions: u.permissions
    }));
  
  res.json({ users: userList });
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  console.error('[ERROR]', error);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.listen(PORT, () => {
  console.log(`🔐 Serviço de Usuários rodando na porta ${PORT}`);
  console.log(`📚 Usuários de teste disponíveis:`);
  console.log(`   Admin: admin@clinicare.com / password`);
  console.log(`   Médico: medico@clinicare.com / password`);
  console.log(`   Secretária: secretaria@clinicare.com / password`);
});