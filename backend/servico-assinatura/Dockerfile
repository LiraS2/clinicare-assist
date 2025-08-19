FROM node:18-alpine

# Instalar dependências do sistema para PKI Express
RUN apk add --no-cache \
    ca-certificates \
    openssl \
    curl

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY . .

# Criar diretório temporário
RUN mkdir -p temp

# Expor porta
EXPOSE 3005

# Comando para iniciar o serviço
CMD ["npm", "start"]