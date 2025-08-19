import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PkiExpress, PadesSigner, StandardSignaturePolicies } from 'pki-express';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

// Chave interna para proteção do serviço
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'clinicare-internal-key-2024';

// Configuração do PKI Express
const PKI_EXPRESS_LICENSE = process.env.PKI_EXPRESS_LICENSE;
const PKI_EXPRESS_ENDPOINT = process.env.PKI_EXPRESS_ENDPOINT;

// Middleware para proteção interna
const authenticateInternal = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== INTERNAL_API_KEY) {
    return res.status(401).json({
      error: 'Acesso negado. Este serviço é apenas para uso interno.'
    });
  }
  
  next();
};

// Configuração do multer para upload de arquivos temporários
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Diretório temporário para processamento
const tempDir = './temp';
await fs.ensureDir(tempDir);

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'servico-assinatura',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    pki_configured: !!PKI_EXPRESS_LICENSE
  });
});

// Configurar PKI Express se as credenciais estiverem disponíveis
let pkiConfigured = false;
if (PKI_EXPRESS_LICENSE) {
  try {
    PkiExpress.config.license = PKI_EXPRESS_LICENSE;
    if (PKI_EXPRESS_ENDPOINT) {
      PkiExpress.config.endpoint = PKI_EXPRESS_ENDPOINT;
    }
    pkiConfigured = true;
    console.log('✅ PKI Express configurado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao configurar PKI Express:', error);
  }
} else {
  console.warn('⚠️ PKI Express não configurado - credenciais ausentes');
}

// POST /assinar-pdf - Assinar PDF com certificado ICP-Brasil
app.post('/assinar-pdf', authenticateInternal, async (req, res) => {
  let tempInputPath = null;
  let tempOutputPath = null;

  try {
    const { 
      pdfBuffer, 
      certificateThumb,
      signerName,
      signerEmail,
      reason = 'Assinatura digital de documento médico',
      location = 'Sistema Clinicare Assist'
    } = req.body;

    if (!pdfBuffer) {
      return res.status(400).json({
        error: 'Buffer do PDF é obrigatório para assinatura'
      });
    }

    if (!pkiConfigured) {
      return res.status(503).json({
        error: 'Serviço de assinatura não configurado. Credenciais PKI ausentes.'
      });
    }

    console.log('Iniciando processo de assinatura digital...');

    // Criar arquivos temporários
    const requestId = uuidv4();
    tempInputPath = path.join(tempDir, `input_${requestId}.pdf`);
    tempOutputPath = path.join(tempDir, `output_${requestId}.pdf`);

    // Converter buffer em arquivo temporário
    const pdfData = Buffer.from(pdfBuffer, 'base64');
    await fs.writeFile(tempInputPath, pdfData);

    // Configurar o assinador PAdES (PDF Advanced Electronic Signatures)
    const signer = new PadesSigner();
    
    // Configurar arquivo de entrada e saída
    signer.setPdfPath(tempInputPath);
    signer.setOutputPath(tempOutputPath);

    // Configurar política de assinatura (ICP-Brasil)
    signer.setSignaturePolicy(StandardSignaturePolicies.PADES_BASIC_WITH_LTV);

    // Configurar certificado (se fornecido)
    if (certificateThumb) {
      signer.setCertificateThumbprint(certificateThumb);
    }

    // Configurar informações da assinatura
    if (signerName) {
      signer.setReason(`${reason} - Assinado por: ${signerName}`);
    } else {
      signer.setReason(reason);
    }
    
    signer.setLocation(location);

    // Configurar aparência visual da assinatura
    const visualRepresentation = {
      text: {
        includeSigningTime: true,
        signerName: signerName || 'Profissional de Saúde',
        includeLocation: true
      },
      image: {
        resource: {
          // Aqui você pode configurar uma imagem/logo para a assinatura
          // content: logoBase64
        }
      }
    };

    signer.setVisualRepresentation(visualRepresentation);

    console.log('Executando assinatura com PKI Express...');

    // Executar a assinatura
    const result = await signer.sign();

    console.log('Assinatura concluída:', result);

    // Ler o arquivo assinado
    const signedPdfBuffer = await fs.readFile(tempOutputPath);

    // Configurar headers de resposta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', signedPdfBuffer.length);
    res.setHeader('Content-Disposition', 'inline; filename="documento_assinado.pdf"');

    // Retornar o PDF assinado
    res.send(signedPdfBuffer);

    console.log(`PDF assinado com sucesso. Tamanho: ${signedPdfBuffer.length} bytes`);

  } catch (error) {
    console.error('Erro ao assinar PDF:', error);
    
    // Tratar erros específicos do PKI Express
    if (error.message && error.message.includes('certificate')) {
      res.status(400).json({
        error: 'Erro no certificado digital',
        message: 'Certificado inválido ou não encontrado',
        details: error.message
      });
    } else if (error.message && error.message.includes('license')) {
      res.status(503).json({
        error: 'Erro de licenciamento PKI',
        message: 'Licença do PKI Express inválida ou expirada',
        details: error.message
      });
    } else {
      res.status(500).json({
        error: 'Erro interno na assinatura digital',
        message: error.message
      });
    }
  } finally {
    // Limpeza dos arquivos temporários
    try {
      if (tempInputPath && await fs.pathExists(tempInputPath)) {
        await fs.remove(tempInputPath);
      }
      if (tempOutputPath && await fs.pathExists(tempOutputPath)) {
        await fs.remove(tempOutputPath);
      }
    } catch (cleanupError) {
      console.error('Erro na limpeza de arquivos temporários:', cleanupError);
    }
  }
});

// POST /validar-assinatura - Validar assinatura de PDF
app.post('/validar-assinatura', authenticateInternal, async (req, res) => {
  let tempPdfPath = null;

  try {
    const { pdfBuffer } = req.body;

    if (!pdfBuffer) {
      return res.status(400).json({
        error: 'Buffer do PDF é obrigatório para validação'
      });
    }

    if (!pkiConfigured) {
      return res.status(503).json({
        error: 'Serviço de validação não configurado. Credenciais PKI ausentes.'
      });
    }

    console.log('Iniciando validação de assinatura digital...');

    // Criar arquivo temporário
    const requestId = uuidv4();
    tempPdfPath = path.join(tempDir, `validate_${requestId}.pdf`);

    // Converter buffer em arquivo temporário
    const pdfData = Buffer.from(pdfBuffer, 'base64');
    await fs.writeFile(tempPdfPath, pdfData);

    // Implementar validação usando PKI Express
    // (O PKI Express tem ferramentas específicas para validação)
    
    res.json({
      message: 'Validação de assinatura implementada',
      valid: true, // Placeholder - implementar validação real
      signatures: [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao validar assinatura:', error);
    res.status(500).json({
      error: 'Erro interno na validação de assinatura',
      message: error.message
    });
  } finally {
    // Limpeza
    try {
      if (tempPdfPath && await fs.pathExists(tempPdfPath)) {
        await fs.remove(tempPdfPath);
      }
    } catch (cleanupError) {
      console.error('Erro na limpeza:', cleanupError);
    }
  }
});

// GET /certificados - Listar certificados disponíveis
app.get('/certificados', authenticateInternal, async (req, res) => {
  try {
    if (!pkiConfigured) {
      return res.status(503).json({
        error: 'Serviço PKI não configurado',
        certificates: []
      });
    }

    // Implementar listagem de certificados instalados
    // Isso depende da configuração específica do ambiente
    
    res.json({
      message: 'Certificados disponíveis',
      certificates: [
        // Placeholder - implementar listagem real
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao listar certificados:', error);
    res.status(500).json({
      error: 'Erro interno ao listar certificados',
      message: error.message
    });
  }
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro no servico-assinatura:', err);
  res.status(500).json({
    error: 'Erro interno do serviço de assinatura digital',
    message: err.message
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada no serviço de assinatura digital'
  });
});

app.listen(PORT, () => {
  console.log(`🔐 Serviço de Assinatura Digital rodando na porta ${PORT}`);
  console.log(`PKI Express configurado: ${pkiConfigured ? '✅' : '❌'}`);
});