# 🛠️ Guia de Compilação do Sentinela Frigate Pro no GitHub Codespaces

Este documento contém todos os comandos exatos e sequenciais para clonar, configurar o ambiente, compilar os aplicativos Android (TV e Smartphone), rodar o backend FastAPI e compilar o frontend Next.js dentro do **GitHub Codespaces**.

---

## 1. Requisitos do Codespace
- Tipo de máquina recomendado: **4-core ou 8-core CPU / 16GB RAM** (garante compilação rápida do Gradle e otimização do Node/Webpack).
- Imagem base padrão: Ubuntu 22.04 LTS (Universal devcontainer).

---

## 2. Preparação do Ambiente Android (SDK + JDK 17)

Execute os comandos abaixo no terminal do Codespaces para instalar o OpenJDK 17 e o Android Command Line Tools:

```bash
# Atualizar repositórios e instalar OpenJDK 17
sudo apt-get update && sudo apt-get install -y openjdk-17-jdk wget unzip

# Configurar variáveis de ambiente do Java e Android SDK
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=$HOME/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

# Criar diretório do Android SDK e baixar commandlinetools
mkdir -p $ANDROID_HOME/cmdline-tools
cd $ANDROID_HOME/cmdline-tools
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O cmdline-tools.zip
unzip cmdline-tools.zip
mv cmdline-tools latest
rm cmdline-tools.zip

# Aceitar licenças e instalar componentes do SDK
yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
```

---

## 3. Compilação dos APKs Nativos Android

Navegue até o diretório `android` e execute o Gradle Wrapper para compilar ambas as variantes (TV e Smartphone):

```bash
cd /workspaces/SentinelaFrPro/android

# Dar permissão de execução ao wrapper
chmod +x gradlew

# Compilar todos os APKs em modo Release
./gradlew assembleRelease

# (Opcional) Compilar separadamente por sabor/flavor se configurado:
# ./gradlew assembleTvRelease
# ./gradlew assembleSmartphoneRelease
```

### Localização dos APKs Gerados:
- **Android TV:** `android/app/build/outputs/apk/tv/release/app-tv-release.apk`
- **Smartphone:** `android/app/build/outputs/apk/smartphone/release/app-smartphone-release.apk`

---

## 4. Execução e Testes do Backend (FastAPI Core)

```bash
cd /workspaces/SentinelaFrPro/backend

# Criar e ativar ambiente virtual Python
python3 -m venv venv
source venv/bin/activate

# Instalar dependências de alta performance
pip install --upgrade pip
pip install -r requirements.txt

# Executar suíte de testes de especificação do core
pytest

# Iniciar o servidor FastAPI em modo de desenvolvimento (Porta 8080)
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

---

## 5. Compilação e Build do Web Dashboard (Next.js 14)

```bash
cd /workspaces/SentinelaFrPro/frontend

# Instalar pacotes NPM com resolução estrita
npm install

# Validar tipagem TypeScript (Zero-Error Check)
npx tsc --noEmit

# Gerar bundle otimizado de produção
npm run build

# Iniciar servidor SSR de produção (Porta 3000)
npm run start
```

---

## 6. Auditoria de Especificação & Governança (onp-spec)

Para garantir que todos os 31 critérios da constituição e as invariantes de streaming estejam respeitados antes do commit:

```bash
cd /workspaces/SentinelaFrPro

# Executar testes nativos Node.js
node --test test/*.js

# Atualizar grafo de conhecimento do projeto
graphify update .
```
