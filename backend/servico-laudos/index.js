import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://jfirspguolaurlbynxrs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'clinicare-secret-key', (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = decoded;
    next();
  });
};

// Permission Middleware
const requirePermission = (permission) => {
  return (req, res, next) => {
    const userPermissions = req.user.permissions || [];
    
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ 
        error: 'Permissão insuficiente para esta operação',
        required: permission 
      });
    }
    next();
  };
};

// Role Middleware
const requireRole = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ 
        error: 'Função insuficiente para esta operação',
        required: role,
        current: req.user.role 
      });
    }
    next();
  };
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'servico-laudos',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// POST /laudos - Criar novo laudo (apenas médicos)
app.post('/laudos', authenticateToken, requireRole('medico'), async (req, res) => {
  try {
    const { patient_id, content_jsonb } = req.body;
    
    if (!patient_id) {
      return res.status(400).json({ error: 'patient_id é obrigatório' });
    }

    // Verificar se o paciente existe
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('id', patient_id)
      .single();

    if (patientError || !patient) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    // Criar o laudo
    const { data: laudo, error } = await supabase
      .from('medical_reports')
      .insert({
        patient_id,
        created_by_user_id: req.user.sub,
        content_jsonb: content_jsonb || {},
        status: 'rascunho'
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar laudo:', error);
      return res.status(500).json({ error: 'Erro ao criar laudo' });
    }

    res.status(201).json({
      message: 'Laudo criado com sucesso',
      data: laudo
    });
  } catch (error) {
    console.error('Erro no POST /laudos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /laudos/:id - Buscar laudo específico
app.get('/laudos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: laudo, error } = await supabase
      .from('medical_reports')
      .select(`
        *,
        patients:patient_id (
          id,
          full_name,
          cpf,
          birth_date
        )
      `)
      .eq('report_id', id)
      .single();

    if (error || !laudo) {
      return res.status(404).json({ error: 'Laudo não encontrado' });
    }

    // Verificar se o usuário tem permissão para ver este laudo
    const userRole = req.user.role;
    const isCreator = laudo.created_by_user_id === req.user.sub;
    
    if (userRole !== 'medico' && userRole !== 'admin' && !isCreator) {
      return res.status(403).json({ error: 'Acesso negado a este laudo' });
    }

    res.json({
      message: 'Laudo encontrado',
      data: laudo
    });
  } catch (error) {
    console.error('Erro no GET /laudos/:id:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /laudos/:id - Atualizar laudo existente (apenas médicos)
app.put('/laudos/:id', authenticateToken, requireRole('medico'), async (req, res) => {
  try {
    const { id } = req.params;
    const { content_jsonb, status } = req.body;

    // Verificar se o laudo existe e se o usuário pode editá-lo
    const { data: existingLaudo, error: fetchError } = await supabase
      .from('medical_reports')
      .select('*')
      .eq('report_id', id)
      .single();

    if (fetchError || !existingLaudo) {
      return res.status(404).json({ error: 'Laudo não encontrado' });
    }

    // Verificar se o usuário é o criador ou admin
    const userRole = req.user.role;
    const isCreator = existingLaudo.created_by_user_id === req.user.sub;
    
    if (userRole !== 'admin' && !isCreator) {
      return res.status(403).json({ error: 'Apenas o criador do laudo ou administradores podem editá-lo' });
    }

    // Preparar dados para atualização
    const updateData = {};
    if (content_jsonb !== undefined) updateData.content_jsonb = content_jsonb;
    if (status !== undefined) {
      if (!['rascunho', 'liberado', 'assinado'].includes(status)) {
        return res.status(400).json({ error: 'Status inválido' });
      }
      updateData.status = status;
    }

    // Atualizar o laudo
    const { data: updatedLaudo, error } = await supabase
      .from('medical_reports')
      .update(updateData)
      .eq('report_id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar laudo:', error);
      return res.status(500).json({ error: 'Erro ao atualizar laudo' });
    }

    res.json({
      message: 'Laudo atualizado com sucesso',
      data: updatedLaudo
    });
  } catch (error) {
    console.error('Erro no PUT /laudos/:id:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /pacientes/:pacienteId/laudos - Listar laudos de um paciente
app.get('/pacientes/:pacienteId/laudos', authenticateToken, async (req, res) => {
  try {
    const { pacienteId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // Verificar se o paciente existe
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, full_name')
      .eq('id', pacienteId)
      .single();

    if (patientError || !patient) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    // Construir query
    let query = supabase
      .from('medical_reports')
      .select(`
        report_id,
        content_jsonb,
        status,
        signed_pdf_path,
        created_at,
        updated_at,
        created_by_user_id
      `)
      .eq('patient_id', pacienteId)
      .order('created_at', { ascending: false });

    // Filtrar por status se fornecido
    if (status) {
      query = query.eq('status', status);
    }

    // Paginação
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: laudos, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar laudos:', error);
      return res.status(500).json({ error: 'Erro ao buscar laudos' });
    }

    res.json({
      message: 'Laudos encontrados',
      data: {
        patient: patient,
        reports: laudos || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count
        }
      }
    });
  } catch (error) {
    console.error('Erro no GET /pacientes/:pacienteId/laudos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /laudos/:id - Excluir laudo (apenas médicos e admins)
app.delete('/laudos/:id', authenticateToken, requireRole('medico'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o laudo existe
    const { data: existingLaudo, error: fetchError } = await supabase
      .from('medical_reports')
      .select('*')
      .eq('report_id', id)
      .single();

    if (fetchError || !existingLaudo) {
      return res.status(404).json({ error: 'Laudo não encontrado' });
    }

    // Verificar permissões
    const userRole = req.user.role;
    const isCreator = existingLaudo.created_by_user_id === req.user.sub;
    
    if (userRole !== 'admin' && !isCreator) {
      return res.status(403).json({ error: 'Apenas o criador do laudo ou administradores podem excluí-lo' });
    }

    // Não permitir exclusão de laudos assinados
    if (existingLaudo.status === 'assinado') {
      return res.status(400).json({ error: 'Não é possível excluir laudos assinados' });
    }

    const { error } = await supabase
      .from('medical_reports')
      .delete()
      .eq('report_id', id);

    if (error) {
      console.error('Erro ao excluir laudo:', error);
      return res.status(500).json({ error: 'Erro ao excluir laudo' });
    }

    res.json({ message: 'Laudo excluído com sucesso' });
  } catch (error) {
    console.error('Erro no DELETE /laudos/:id:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /laudos/:id/assinar - Assinar laudo digitalmente
app.post('/laudos/:id/assinar', authenticateToken, requireRole('medico'), async (req, res) => {
  try {
    const { id } = req.params;
    const { digital_signature_data } = req.body;

    // Verificar se o laudo existe
    const { data: existingLaudo, error: fetchError } = await supabase
      .from('medical_reports')
      .select('*')
      .eq('report_id', id)
      .single();

    if (fetchError || !existingLaudo) {
      return res.status(404).json({ error: 'Laudo não encontrado' });
    }

    // Verificar se o usuário pode assinar
    const isCreator = existingLaudo.created_by_user_id === req.user.sub;
    if (!isCreator && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas o criador do laudo pode assiná-lo' });
    }

    // Verificar se já está assinado
    if (existingLaudo.status === 'assinado') {
      return res.status(400).json({ error: 'Laudo já está assinado' });
    }

    // Simular processo de assinatura digital
    const signedPdfPath = `/signed-reports/${id}_signed_${Date.now()}.pdf`;

    const { data: signedLaudo, error } = await supabase
      .from('medical_reports')
      .update({
        status: 'assinado',
        signed_pdf_path: signedPdfPath
      })
      .eq('report_id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao assinar laudo:', error);
      return res.status(500).json({ error: 'Erro ao assinar laudo' });
    }

    res.json({
      message: 'Laudo assinado com sucesso',
      data: signedLaudo
    });
  } catch (error) {
    console.error('Erro no POST /laudos/:id/assinar:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
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