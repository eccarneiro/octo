# 🐙 Octo CLI

> **The Ultimate Converter Engine** — Uma CLI poderosa para automação de conversão de mídia e dados.

Octo CLI é uma ferramenta de linha de comando construída com **Bun** e **TypeScript** que reúne em um só lugar tudo o que você precisa para converter, comprimir e processar vídeos, imagens, documentos e dados.

---

## ✨ Features

| Módulo | Funcionalidades |
|---|---|
| 🎬 **Vídeo Tools** | Comprimir (H.264/H.265), Converter (MP4, MOV, AVI, WebM), Redimensionar (1080p, 720p, 480p) |
| 🖼️ **Imagem Tools** | Comprimir (qualidade configurável), Converter (PNG, JPG, WebP, AVIF), Redimensionar (largura/altura) |
| 📺 **YouTube Downloader** | Download de vídeo (MP4) e áudio (MP3), escolha de qualidade, preview de metadados |
| 📄 **Documentos** | Markdown → HTML estilizado, Markdown → PDF (via HTML imprimível) |
| 💾 **Dados & Utils** | Conversão entre JSON ↔ CSV ↔ YAML |

**Extras:**
- 🧭 Menu interativo com navegação **← Voltar**
- 📊 Barra de progresso em tempo real para downloads e processamento
- 📂 Processamento em lote (pasta inteira de vídeos/imagens)
- 🎯 Detecção automática de `yt-dlp` e `ffmpeg` no sistema

---

## 🚀 Instalação

### Pré-requisitos

- [Bun](https://bun.sh/) (runtime)
- [FFmpeg](https://ffmpeg.org/) (para processamento de vídeo)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (para download do YouTube)

```bash
# macOS
brew install bun ffmpeg yt-dlp

# Linux
curl -fsSL https://bun.sh/install | bash
sudo apt install ffmpeg
pip install yt-dlp
```

### Setup do projeto

```bash
git clone https://github.com/seu-usuario/octo.git
cd octo
bun install
```

---

## 📖 Uso

### Menu Interativo (recomendado)

```bash
bun run dev
```

Abre o menu interativo onde você navega com as setas do teclado e seleciona as opções:

```
   ____  ________________     ________    ____
  / __ \/ ____/_  __/ __ \   / ____/ /   /  _/
 / / / / /     / / / / / /  / /   / /    / /
/ /_/ / /___  / / / /_/ /  / /___/ /____/ /
\____/\____/ /_/  \____/   \____/_____/___/

 v0.0.1 • The Ultimate Converter Engine

┌  Olá! Como posso te ajudar hoje?
│
◇  Escolha um módulo:
│  🎬 Vídeo Tools
│  🖼️  Imagem Tools
│  📺 YouTube Downloader
│  📄 Documentos
│  💾 Dados & Utils
│  🚪 Sair
```

### Comandos Diretos (CLI)

#### 📺 YouTube

```bash
# Download de vídeo (melhor qualidade)
octo youtube https://youtube.com/watch?v=...

# Download de áudio (MP3)
octo youtube https://youtube.com/watch?v=... -a

# Vídeo em 720p, salvar em pasta específica
octo youtube https://youtube.com/watch?v=... -q 720 -o ~/Videos
```

#### 🎬 Vídeo

```bash
# Comprimir com H.265
octo video -a compress -i ./videos -o ./output -p h265

# Converter para WebM
octo video -a convert -i ./videos -o ./output -f webm

# Redimensionar para 720p
octo video -a resize -i ./videos -o ./output -r 720
```

#### 🖼️ Imagens

```bash
# Comprimir imagens (qualidade 60%)
octo image -a compress -i ./imgs -o ./output -q 60

# Converter para WebP
octo image -a convert -i ./imgs -o ./output -f webp

# Redimensionar para 800px de largura
octo image -a resize -i ./imgs -o ./output -w 800
```

#### 📄 Documentos

```bash
# Markdown para HTML
octo docs ./README.md --to html

# Markdown para PDF (HTML imprimível)
octo docs ./README.md --to pdf -o ~/Desktop
```

#### 💾 Dados

```bash
# JSON para CSV
octo data ./dados.json -t csv

# CSV para YAML
octo data ./planilha.csv -t yaml

# YAML para JSON
octo data ./config.yaml -t json
```

---

## 🛠️ Stack Tecnológica

| Tecnologia | Papel |
|---|---|
| **Bun** | Runtime e bundler |
| **TypeScript** | Tipagem estática |
| **Commander.js** | Parsing de comandos CLI |
| **@clack/prompts** | Interface interativa (TUI) |
| **fluent-ffmpeg** | Processamento de vídeo |
| **Sharp** | Processamento de imagens |
| **youtube-dl-exec** | Download do YouTube |
| **marked** | Parser de Markdown |
| **Listr2** | Task runner com progresso |
| **Chalk + Figlet** | Cores e branding |

---

## 📦 Build

Para compilar para um binário standalone:

```bash
bun run build
```

Gera um executável `octo` que pode ser usado sem o Bun instalado.

---

## 📄 Licença

MIT

---

<p align="center">
  Feito com 🐙 por <a href="https://github.com/seu-usuario">Emanuel Corrêa</a>
</p>
