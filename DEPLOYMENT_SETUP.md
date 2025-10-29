# Configuração de Deploy AWS

Este documento descreve como configurar as variáveis de ambiente para deploy na AWS.

## Arquitetura de Configuração

### Variáveis Não-Sensíveis (ecosystem.config.js)
Variáveis de configuração **não-sensíveis** são definidas no arquivo `ecosystem.config.js`, versionado no Git:

- `NODE_ENV`: Ambiente de execução (aws, production, development)
- `PORT`: Porta do servidor (3001)
- `SECRET_NAME`: Nome do secret no AWS Secrets Manager para credenciais RDS
- `AWS_REGION`: Região AWS (us-east-1)

**Vantagens:**
- ✅ Versionamento no Git
- ✅ Fácil auditoria de mudanças
- ✅ Zero overhead de chamadas AWS no boot da aplicação
- ✅ Configuração declarativa via PM2

### Variáveis Sensíveis (AWS Secrets Manager)

#### Secret Único Consolidado
Nome: `money2-backend-dev-secret-rds` (ajuste conforme seu ambiente)

Este secret armazena **TODAS** as credenciais e secrets da aplicação em um único JSON:

**Estrutura do Secret:**
```json
{
  "host": "my-money-db.cluster-xyz.us-east-1.rds.amazonaws.com",
  "username": "admin_generated",
  "password": "auto-generated-password-123",
  "port": "5432",
  "dbname": "myapp_production",
  "jwt_secret": "your-secure-jwt-token-here"
}
```

**Como o código usa:**
1. **Credenciais RDS** (`host`, `username`, `password`, `port`, `dbname`):
   - Lidas por `src/utils/aws-secrets.js` no boot
   - Usadas para construir `DATABASE_URL` para o Prisma

2. **JWT Secret** (`jwt_secret`):
   - Buscado pelo script `application_start.sh` no deploy
   - Exportado como variável de ambiente `JWT_SECRET`
   - Lido pelo código via `process.env.JWT_SECRET`

## Configuração do Secret no AWS Secrets Manager

### Passo 1: Criar/Atualizar o Secret

#### Se o secret já existe (criado automaticamente pelo RDS):
```bash
# Buscar o valor atual
aws secretsmanager get-secret-value \
  --secret-id money2-backend-dev-secret-rds \
  --region us-east-1 \
  --query 'SecretString' \
  --output text > current-secret.json

# Adicionar jwt_secret ao JSON (edite o arquivo)
# Exemplo: {"host":"...","username":"...","jwt_secret":"NEW_VALUE_HERE"}

# Atualizar o secret
aws secretsmanager update-secret \
  --secret-id money2-backend-dev-secret-rds \
  --region us-east-1 \
  --secret-string file://current-secret.json

# Limpar arquivo temporário
rm current-secret.json
```

#### Se o secret não existe (criar do zero):
```bash
aws secretsmanager create-secret \
  --name money2-backend-dev-secret-rds \
  --description "RDS credentials and JWT secret for My Money backend" \
  --secret-string '{
    "host": "your-rds-endpoint.us-east-1.rds.amazonaws.com",
    "username": "admin",
    "password": "your-secure-db-password",
    "port": "5432",
    "dbname": "mymoney",
    "jwt_secret": "your-secure-jwt-token-here"
  }' \
  --region us-east-1
```

**⚠️ IMPORTANTE: Gere um JWT_SECRET seguro:**
```bash
# Linux/macOS
openssl rand -base64 32

# Ou Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Passo 2: Configurar Permissões IAM

A instância EC2 ou role do CodeDeploy precisa desta política:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:money2-backend-dev-secret-rds-*"
    }
  ]
}
```

**Como aplicar via AWS CLI:**
```bash
# Substituir ROLE_NAME pela sua role da EC2
aws iam put-role-policy \
  --role-name YOUR_EC2_ROLE_NAME \
  --policy-name SecretsManagerAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:money2-backend-dev-secret-rds-*"
    }]
  }'
```

## Fluxo de Deploy

### 1. CodeDeploy executa application_start.sh
O script:
1. ✅ Cria symlink para o release atual
2. ✅ Valida que PM2 está instalado
3. ✅ Valida que `ecosystem.config.js` existe
4. ✅ Cria diretório de logs
5. ✅ **Busca `JWT_SECRET` do Secrets Manager** via AWS CLI
6. ✅ Exporta `JWT_SECRET` como variável de ambiente
7. ✅ Remove processos PM2 antigos
8. ✅ Inicia aplicação com `pm2 start ecosystem.config.js --update-env`

### 2. PM2 inicia a aplicação Node.js
- Injeta variáveis do `ecosystem.config.js` + `JWT_SECRET` exportado pelo shell
- Aplicação inicia com todas as env vars necessárias

### 3. Aplicação Node.js no boot (src/index.js)
```javascript
// index.js já chama awsSecrets.getConfig() no boot
const config = await awsSecrets.getConfig();

// aws-secrets.js:
// - Busca credenciais RDS do Secrets Manager
// - Constrói DATABASE_URL
// - Lê JWT_SECRET de process.env.JWT_SECRET (injetado pelo PM2)
```

**✅ ZERO mudanças no código Node.js são necessárias!**

## Ambientes Diferentes (Dev/Staging/Prod)

### Opção 1: Secrets separados por ambiente
```bash
# Desenvolvimento
SECRET_NAME=money2-backend-dev-secret-rds

# Staging
SECRET_NAME=money2-backend-staging-secret-rds

# Produção
SECRET_NAME=money2-backend-prod-secret-rds
```

Defina `SECRET_NAME` no `ecosystem.config.js` ou como variável de ambiente do sistema.

### Opção 2: ecosystem.config.js com múltiplos ambientes
```javascript
module.exports = {
  apps: [{
    name: 'meu-backend',
    script: './src/index.js',
    env_development: {
      NODE_ENV: 'development',
      SECRET_NAME: 'money2-backend-dev-secret-rds',
      PORT: 3001,
      AWS_REGION: 'us-east-1'
    },
    env_production: {
      NODE_ENV: 'production',
      SECRET_NAME: 'money2-backend-prod-secret-rds',
      PORT: 3001,
      AWS_REGION: 'us-east-1'
    }
  }]
};
```

**Iniciar com ambiente específico:**
```bash
pm2 start ecosystem.config.js --env production
```

## Verificação do Deploy

### Após o deploy, verifique:

```bash
# 1. Status do PM2
pm2 list

# 2. Verificar variáveis de ambiente carregadas
pm2 show meu-backend

# 3. Logs da aplicação (buscar por "Configuration loaded")
pm2 logs meu-backend --lines 50

# 4. Verificar se JWT_SECRET foi injetado (NÃO deve aparecer o valor!)
pm2 logs meu-backend | grep "JWT_SECRET: configured"

# 5. Testar endpoint de health
curl http://localhost:3001/health

# 6. Testar autenticação (deve funcionar)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

## Troubleshooting

### ❌ Erro: "JWT_SECRET não disponível"
**Causa:** O script não conseguiu buscar JWT_SECRET do Secrets Manager.

**Soluções:**
```bash
# 1. Verificar se o secret existe e contém jwt_secret
aws secretsmanager get-secret-value \
  --secret-id money2-backend-dev-secret-rds \
  --region us-east-1 \
  --query 'SecretString' \
  --output text | jq '.jwt_secret'

# 2. Verificar permissões IAM da instância EC2
aws sts get-caller-identity  # Ver qual identity está sendo usada

# 3. Verificar se jq está instalado
which jq || sudo yum install -y jq
```

### ❌ Erro: "PM2 não encontrado"
```bash
# Instalar PM2 globalmente como appuser
npm install -g pm2

# Adicionar PM2 ao PATH se necessário
export PATH=$PATH:$(npm bin -g)
```

### ❌ Erro: "ecosystem.config.js não encontrado"
Verifique se o arquivo foi incluído no bundle do CodeDeploy em `appspec.yml`:

```yaml
files:
  - source: /
    destination: /opt/apps/backend/releases/{{deployment_id}}
```

### ❌ Erro: "Failed to retrieve secret: Access Denied"
**Causa:** Role da EC2 não tem permissão para acessar o secret.

**Solução:** Revisar permissões IAM (ver seção "Configurar Permissões IAM" acima).

### ⚠️ Aplicação não inicia ou crashloop
```bash
# Ver logs detalhados de erro
pm2 logs meu-backend --err --lines 100

# Verificar variáveis de ambiente
pm2 env 0  # 0 é o ID do processo

# Ver informações completas do processo
pm2 show meu-backend
```

## Alternativa Simples (Apenas para Desenvolvimento)

Se você **não quer** usar Secrets Manager para `JWT_SECRET` (apenas para dev local):

**Adicione ao ecosystem.config.js:**
```javascript
env: {
  NODE_ENV: 'aws',
  PORT: 3001,
  SECRET_NAME: 'money2-backend-dev-secret-rds',
  AWS_REGION: 'us-east-1',
  JWT_SECRET: 'your-dev-jwt-secret-here'  // ⚠️ Apenas para dev!
}
```

**⚠️ NÃO RECOMENDADO PARA PRODUÇÃO** porque:
- Secret fica versionado no Git (risco de segurança)
- Sem rotação automática
- Dificulta gestão de múltiplos ambientes

## Segurança

### ✅ Boas Práticas Implementadas

1. **JWT_SECRET no Secrets Manager**
   - Não aparece em logs (script faz `export` silencioso)
   - Não versionado no Git
   - Acesso controlado por IAM

2. **Credenciais RDS separadas**
   - Rotação automática (se habilitado no RDS)
   - Busca em runtime, nunca hard-coded

3. **Princípio do menor privilégio**
   - IAM policy limita acesso apenas ao secret necessário

4. **Logs estruturados**
   - PM2 separa stdout e stderr
   - Timestamp automático

### ❌ Evite

- ❌ Commitar `.env` no Git
- ❌ Hard-coding de secrets no código
- ❌ Expor `JWT_SECRET` completo em logs
- ❌ Usar mesmos secrets em dev/prod
- ❌ Dar permissões IAM amplas (`secretsmanager:*`)

## Checklist de Deploy

Antes de fazer deploy para produção:

- [ ] Secret criado no Secrets Manager com `jwt_secret`
- [ ] JWT_SECRET gerado de forma segura (min. 32 bytes randomizados)
- [ ] IAM role da EC2 tem permissão `secretsmanager:GetSecretValue`
- [ ] `ecosystem.config.js` commitado no repositório
- [ ] AWS CLI instalado na instância EC2
- [ ] `jq` instalado na instância EC2 (`sudo yum install -y jq`)
- [ ] PM2 instalado globalmente (`npm install -g pm2`)
- [ ] Testado em ambiente de staging primeiro
- [ ] Secrets diferentes para dev/staging/prod
