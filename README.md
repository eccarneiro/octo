# 🐙 Octo CLI

> **The Ultimate Converter Engine** — A powerful CLI for media and data conversion automation.

Octo CLI is a command-line tool built with **Bun** and **TypeScript** that brings everything you need to convert, compress, and process videos, images, documents, and data — all in one place.

---

## ✨ Features

| Module | Capabilities |
|---|---|
| 🎬 **Video Tools** | Compress (H.264/H.265), Convert (MP4, MOV, AVI, WebM), Resize (1080p, 720p, 480p) |
| 🖼️ **Image Tools** | Compress (configurable quality), Convert (PNG, JPG, WebP, AVIF), Resize (width/height) |
| 📺 **YouTube Downloader** | Video (MP4) & audio (MP3) download, quality selection, metadata preview |
| 📄 **Documents** | Markdown → Styled HTML, Markdown → PDF (printable HTML) |
| 💾 **Data & Utils** | Convert between JSON ↔ CSV ↔ YAML |

**Extras:**
- 🧭 Interactive menu with **← Back** navigation
- 📊 Real-time progress bar for downloads and processing
- 📂 Batch processing (entire folder of videos/images)
- 🎯 Auto-detection of `yt-dlp` and `ffmpeg` on the system

---

## 🚀 Installation

### Prerequisites

- [Bun](https://bun.sh/) (runtime)
- [FFmpeg](https://ffmpeg.org/) (for video processing)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (for YouTube downloads)

```bash
# macOS
brew install bun ffmpeg yt-dlp

# Linux
curl -fsSL https://bun.sh/install | bash
sudo apt install ffmpeg
pip install yt-dlp
```

### Project Setup

```bash
git clone https://github.com/your-username/octo.git
cd octo
bun install
```

---

## 📖 Usage

### Interactive Menu (recommended)

```bash
bun run dev
```

Opens the interactive menu where you navigate with arrow keys and select options:

```
   ____  ________________     ________    ____
  / __ \/ ____/_  __/ __ \   / ____/ /   /  _/
 / / / / /     / / / / / /  / /   / /    / /
/ /_/ / /___  / / / /_/ /  / /___/ /____/ /
\____/\____/ /_/  \____/   \____/_____/___/

 v0.0.1 • The Ultimate Converter Engine

┌  Hello! How can I help you today?
│
◇  Choose a module:
│  🎬 Video Tools
│  🖼️  Image Tools
│  📺 YouTube Downloader
│  📄 Documents
│  💾 Data & Utils
│  🚪 Exit
```

### Direct Commands (CLI)

#### 📺 YouTube

```bash
# Download video (best quality)
octo youtube https://youtube.com/watch?v=...

# Download audio only (MP3)
octo youtube https://youtube.com/watch?v=... -a

# Video at 720p, save to specific folder
octo youtube https://youtube.com/watch?v=... -q 720 -o ~/Videos
```

#### 🎬 Video

```bash
# Compress with H.265
octo video -a compress -i ./videos -o ./output -p h265

# Convert to WebM
octo video -a convert -i ./videos -o ./output -f webm

# Resize to 720p
octo video -a resize -i ./videos -o ./output -r 720
```

#### 🖼️ Images

```bash
# Compress images (60% quality)
octo image -a compress -i ./imgs -o ./output -q 60

# Convert to WebP
octo image -a convert -i ./imgs -o ./output -f webp

# Resize to 800px width
octo image -a resize -i ./imgs -o ./output -w 800
```

#### 📄 Documents

```bash
# Markdown to HTML
octo docs ./README.md --to html

# Markdown to PDF (printable HTML)
octo docs ./README.md --to pdf -o ~/Desktop
```

#### 💾 Data

```bash
# JSON to CSV
octo data ./data.json -t csv

# CSV to YAML
octo data ./spreadsheet.csv -t yaml

# YAML to JSON
octo data ./config.yaml -t json
```

---

## 🛠️ Tech Stack

| Technology | Role |
|---|---|
| **Bun** | Runtime & bundler |
| **TypeScript** | Static typing |
| **Commander.js** | CLI command parsing |
| **@clack/prompts** | Interactive interface (TUI) |
| **fluent-ffmpeg** | Video processing |
| **Sharp** | Image processing |
| **youtube-dl-exec** | YouTube downloads |
| **marked** | Markdown parser |
| **Listr2** | Task runner with progress |
| **Chalk + Figlet** | Colors & branding |

---

## 📦 Build

Compile to a standalone binary:

```bash
bun run build
```

Generates an `octo` executable that can be used without Bun installed.

---

## 📄 License

MIT

---

<p align="center">
  Made with 🐙 by <a href="https://github.com/your-username">Emanuel Corrêa</a>
</p>
