# Análise de Usuários e Permissões

Este documento explica a separação de privilégios no deploy e execução da aplicação.

## 👥 Usuários do Sistema

### 1. **root**
- **Quando usa:** User Data (boot inicial), hooks BeforeInstall e ValidateService
- **Responsabilidades:**
  - Instalar pacotes do sistema (Node.js, PM2, nginx, jq)
  - Criar usuário `appuser`
  - Configurar nginx
  - Criar diretórios `/opt/apps/backend`
  - Ajustar permissões do sistema

### 2. **appuser** (não-privilegiado)
- **Quando usa:** Hooks AfterInstall e ApplicationStart (onde PM2 roda)
- **Responsabilidades:**
  - Executar `npm install`
  - Rodar migrações Prisma
  - **Iniciar PM2 e aplicação Node.js** ✅
  - Gerenciar processos da aplicação
- **Permissões:**
  - Dono de `/opt/apps/backend` e subdiretórios
  - Pode ler/escrever em `/opt/apps/backend/{releases,shared,logs}`
  - **NÃO** pode modificar configurações do sistema
  - **NÃO** pode instalar pacotes globais

## 🔐 Fluxo de Execução por Hook

### User Data (Boot Inicial) - `root`
```bash
# Instala dependências globais
dnf install -y nodejs jq git nginx
npm install -g pm2  # ← PM2 global, disponível para todos

# Nginx configurado como reverse proxy (porta 80 → 3001)
systemctl enable --now nginx
```

**Resultado:** PM2 instalado em `/usr/bin/pm2`, acessível por **todos os usuários**.

### BeforeInstall - `root`
```bash
# Cria appuser se não existir
useradd -m -s /bin/bash appuser

# Valida dependências
node --version    # ✓
pm2 --version     # ✓
aws --version     # ✓
jq --version      # ✓

# Valida IAM role
aws sts get-caller-identity  # Verifica credenciais AWS

# Cria estrutura e ajusta permissões
mkdir -p /opt/apps/backend/{releases,shared,logs}
chown -R appuser:appuser /opt/apps/backend
```

**Resultado:** Ambiente preparado, `appuser` é dono dos diretórios da aplicação.

### AfterInstall - `appuser`
```bash
# Instala dependências da aplicação
cd /opt/apps/backend/releases/{{deployment_id}}
npm install --production

# Roda migrações do banco
npx prisma migrate deploy
npx prisma generate
```

**Resultado:** Aplicação pronta, dependências instaladas como `appuser`.

### ApplicationStart - `appuser` ✅
```bash
# Busca JWT_SECRET do Secrets Manager
JWT_SECRET=$(aws secretsmanager get-secret-value ...)
export JWT_SECRET

# Inicia PM2 como appuser
pm2 delete meu-backend 2>/dev/null || true
pm2 start ecosystem.config.js --update-env
pm2 save
```

**Resultado:**
- PM2 roda como `appuser`
- Processos PM2 pertencem a `appuser`
- Aplicação Node.js roda como `appuser` (porta 3001)
- JWT_SECRET injetado como variável de ambiente

### ValidateService - `root`
```bash
# Valida que serviços estão rodando
curl -f http://localhost:3001/health || exit 1
```

**Resultado:** Deploy validado.

## 🔒 Segurança e Isolamento

### ✅ Boas Práticas Implementadas

1. **Princípio do Menor Privilégio**
   - Aplicação **nunca** roda como root
   - `appuser` tem acesso **apenas** a `/opt/apps/backend`
   - PM2 processos isolados por usuário

2. **Separação de Responsabilidades**
   - Root: instalação e configuração do sistema
   - appuser: operações da aplicação

3. **IAM via Instance Profile**
   - Credenciais AWS propagadas automaticamente via IMDS
   - Funciona para **todos os usuários** (root e appuser)
   - Sem necessidade de arquivos `~/.aws/credentials`

4. **Isolamento de Processos PM2**
   - PM2 de root: `/root/.pm2/`
   - PM2 de appuser: `/home/appuser/.pm2/`
   - Cada usuário vê apenas seus próprios processos

### 🔐 Permissões de Arquivos

```bash
# Estrutura de diretórios
/opt/apps/backend/
├── releases/        # appuser:appuser 755
│   └── {{id}}/     # Código da aplicação
├── shared/          # appuser:appuser 755
│   └── .env        # Não usado (secrets via Secrets Manager)
├── logs/            # appuser:appuser 755
│   ├── pm2-error.log
│   └── pm2-out.log
└── current -> releases/{{id}}  # Symlink
```

### 🌐 Acesso à Rede

- **Nginx (root):** Escuta na porta 80
- **Aplicação (appuser):** Escuta na porta 3001 (localhost only)
- **Comunicação:** `Nginx :80 → Node.js :3001`

**Benefício:** Aplicação não exposta diretamente; apenas via nginx.

## 🧪 Como Verificar

### 1. Verificar quem está rodando PM2
```bash
# Como root
sudo -i
pm2 list  # Não deve mostrar nada ou processos diferentes

# Como appuser
sudo -u appuser pm2 list  # Deve mostrar 'meu-backend'
```

### 2. Verificar processos Node.js
```bash
ps aux | grep node
# Deve mostrar: appuser ... node /opt/apps/backend/current/src/index.js
```

### 3. Verificar permissões
```bash
ls -la /opt/apps/backend/
# releases, shared, logs devem ser appuser:appuser
```

### 4. Verificar IAM como appuser
```bash
sudo -u appuser aws sts get-caller-identity
# Deve retornar ARN da IAM role da EC2
```

### 5. Verificar Secrets Manager como appuser
```bash
sudo -u appuser aws secretsmanager get-secret-value \
  --secret-id money2-backend-dev-secret-rds \
  --region us-east-1 \
  --query 'SecretString' \
  --output text | jq '.jwt_secret'
# Deve retornar o JWT secret
```

## ⚠️ Problemas Comuns

### ❌ "PM2 não encontrado" como appuser
**Causa:** PM2 não está no PATH do appuser.

**Solução:**
```bash
# Verificar onde PM2 foi instalado
which pm2  # Deve retornar /usr/bin/pm2

# Se não estiver, adicionar ao PATH
export PATH=$PATH:/usr/bin
```

### ❌ "Permission denied" ao criar logs
**Causa:** Diretório de logs não pertence a appuser.

**Solução:**
```bash
sudo chown -R appuser:appuser /opt/apps/backend/logs
```

### ❌ "Access Denied" ao buscar secret
**Causa:** IAM role não tem permissões ou não está anexada à EC2.

**Solução:**
1. Verificar se IAM role está anexada:
   ```bash
   curl http://169.254.169.254/latest/meta-data/iam/security-credentials/
   ```
2. Verificar permissões da role no console AWS
3. Adicionar política `secretsmanager:GetSecretValue`

### ❌ PM2 processos de root interferindo
**Causa:** Processos PM2 foram iniciados como root anteriormente.

**Solução:**
```bash
# Parar todos processos PM2 de root
sudo pm2 delete all
sudo pm2 kill

# Garantir que apenas appuser tem processos
sudo -u appuser pm2 list
```

## 📋 Checklist de Segurança

Antes de deploy em produção:

- [ ] Aplicação **nunca** roda como root
- [ ] `appuser` é dono de `/opt/apps/backend`
- [ ] PM2 roda como `appuser` (verificar `ps aux | grep PM2`)
- [ ] IAM role anexada à instância EC2
- [ ] IAM role tem apenas permissões necessárias (não `*`)
- [ ] Nginx roda como root (comportamento padrão OK)
- [ ] Porta 3001 **não exposta** publicamente (apenas localhost)
- [ ] JWT_SECRET **não aparece** em logs
- [ ] Logs de PM2 em `/opt/apps/backend/logs` (appuser-owned)

## 🎯 Resumo

| Componente | Usuário | Porta | Exposição |
|------------|---------|-------|-----------|
| **Nginx** | root | 80 | Pública |
| **Node.js/PM2** | appuser | 3001 | Localhost |
| **CodeDeploy Agent** | root | - | - |

**Tudo correto!** ✅ Aplicação roda com segurança como usuário não-privilegiado.
