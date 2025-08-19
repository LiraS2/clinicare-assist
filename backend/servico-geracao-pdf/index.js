import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import puppeteer from 'puppeteer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Chave interna para proteção do serviço
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'clinicare-internal-key-2024';

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

// POST /gerar-pdf - Converter HTML em PDF com headers/footers dinâmicos
app.post('/gerar-pdf', authenticateInternal, async (req, res) => {
  let browser;
  
  try {
    const { 
      html, 
      options = {},
      title = 'Documento Clinicare',
      author = 'Sistema Clinicare',
      pageFormat = 'A4',
      margin = { top: '100px', bottom: '100px', left: '50px', right: '50px' }
    } = req.body;

    if (!html) {
      return res.status(400).json({
        error: 'Conteúdo HTML é obrigatório para geração do PDF'
      });
    }

    console.log('Iniciando geração de PDF...');
    
    // Inicializar Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Configurar viewport
    await page.setViewport({ width: 1200, height: 800 });

    // Template do cabeçalho dinâmico
    const headerTemplate = `
      <div style="font-size: 10px; padding: 5px; width: 100%; margin: 0; display: flex; justify-content: space-between; border-bottom: 1px solid #ccc;">
        <div style="flex: 1;">
          <strong>Clinicare Assist</strong>
        </div>
        <div style="flex: 1; text-align: center;">
          <strong>${title}</strong>
        </div>
        <div style="flex: 1; text-align: right;">
          Gerado em: <span class="date"></span>
        </div>
      </div>
    `;

    // Template do rodapé dinâmico
    const footerTemplate = `
      <div style="font-size: 10px; padding: 5px; width: 100%; margin: 0; display: flex; justify-content: space-between; border-top: 1px solid #ccc;">
        <div style="flex: 1;">
          Sistema de Gestão Médica - Clinicare Assist
        </div>
        <div style="flex: 1; text-align: center;">
          Página <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>
        <div style="flex: 1; text-align: right;">
          Documento confidencial
        </div>
      </div>
    `;

    // Definir conteúdo HTML
    await page.setContent(html, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000 
    });

    // Configurações do PDF
    const pdfOptions = {
      format: pageFormat,
      printBackground: true,
      margin: margin,
      displayHeaderFooter: true,
      headerTemplate: headerTemplate,
      footerTemplate: footerTemplate,
      preferCSSPageSize: false,
      ...options
    };

    console.log('Gerando PDF com Puppeteer...');
    
    // Gerar PDF
    const pdfBuffer = await page.pdf(pdfOptions);
    
    console.log(`PDF gerado com sucesso. Tamanho: ${pdfBuffer.length} bytes`);

    // Configurar headers de resposta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', `inline; filename="${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
    
    // Retornar o buffer do PDF
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    res.status(500).json({
      error: 'Erro interno na geração do PDF',
      message: error.message
    });
  } finally {
    // Garantir que o browser seja fechado
    if (browser) {
      try {
        await browser.close();
        console.log('Browser Puppeteer fechado com sucesso');
      } catch (closeError) {
        console.error('Erro ao fechar browser:', closeError);
      }
    }
  }
});

// Endpoint legado para manter compatibilidade
app.post('/html-to-pdf', authenticateInternal, async (req, res) => {
  // Redirecionar para o novo endpoint
  req.url = '/gerar-pdf';
  return app._router.handle(req, res);
});

// Endpoint para gerar PDF de relatório específico
app.post('/gerar-relatorio', authenticateInternal, async (req, res) => {
  try {
    const { reportData, template = 'default' } = req.body;
    
    if (!reportData) {
      return res.status(400).json({
        error: 'Dados do relatório são obrigatórios'
      });
    }

    // Template HTML básico para relatórios
    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório Médico - Clinicare</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            margin: 0; 
            padding: 20px;
            color: #333;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #007acc;
            padding-bottom: 20px;
          }
          .patient-info { 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 20px 0;
          }
          .content { 
            margin: 20px 0; 
            min-height: 300px;
          }
          .signature {
            margin-top: 50px;
            text-align: center;
            border-top: 1px solid #333;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>RELATÓRIO MÉDICO</h1>
          <p>Sistema Clinicare Assist</p>
        </div>
        
        <div class="patient-info">
          <h3>Informações do Paciente</h3>
          <p><strong>Nome:</strong> ${reportData.patientName || 'N/A'}</p>
          <p><strong>CPF:</strong> ${reportData.patientCpf || 'N/A'}</p>
          <p><strong>Data de Nascimento:</strong> ${reportData.patientBirthDate || 'N/A'}</p>
        </div>
        
        <div class="content">
          <h3>Conteúdo do Relatório</h3>
          ${reportData.content || '<p>Conteúdo não fornecido</p>'}
        </div>
        
        <div class="signature">
          <p>Médico Responsável: ${reportData.doctorName || 'N/A'}</p>
          <p>CRM: ${reportData.doctorCrm || 'N/A'}</p>
          <p>Data de emissão: ${new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </body>
      </html>
    `;

    // Usar o endpoint de geração de PDF
    req.body = {
      html: reportHtml,
      title: `Relatorio_${reportData.patientName || 'Paciente'}_${Date.now()}`,
      author: reportData.doctorName || 'Sistema Clinicare'
    };

    // Redirecionar para o endpoint principal
    req.url = '/gerar-pdf';
    return app._router.handle(req, res);

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({
      error: 'Erro interno na geração do relatório',
      message: error.message
    });
  }
});

// Endpoint para listar templates disponíveis
app.get('/templates', authenticateInternal, (req, res) => {
  res.json({
    message: 'Templates disponíveis para geração de PDF',
    service: 'servico-geracao-pdf',
    templates: [
      { id: 'default', name: 'Relatório Padrão', description: 'Template básico para relatórios médicos' },
      { id: 'laudo', name: 'Laudo Médico', description: 'Template específico para laudos' },
      { id: 'receita', name: 'Receita Médica', description: 'Template para receitas médicas' }
    ]
  });
});

// Endpoint de status/saúde do Puppeteer
app.get('/puppeteer-status', authenticateInternal, async (req, res) => {
  let browser;
  try {
    console.log('Testando status do Puppeteer...');
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent('<h1>Teste Puppeteer</h1>');
    
    res.json({
      service: 'servico-geracao-pdf',
      puppeteer: 'operational',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
    
  } catch (error) {
    console.error('Erro no teste do Puppeteer:', error);
    res.status(500).json({
      service: 'servico-geracao-pdf',
      puppeteer: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro no servico-geracao-pdf:', err);
  res.status(500).json({
    error: 'Erro interno do serviço de geração de PDF',
    message: err.message
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