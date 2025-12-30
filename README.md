# TTS Bro - n8n Text-to-Speech Node

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![n8n Community Node](https://img.shields.io/badge/n8n-Community%20Node-orange)](https://n8n.io)

**Text-to-Speech n8n node** powered by [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) and the [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) TTS model.

🎯 **Pure JavaScript/WebAssembly** - No native binary dependencies!  
⚡ **High Performance** - Singleton TTS instance for fast subsequent calls  
🔒 **Offline** - Runs completely locally, no API calls needed  
🐳 **Docker Ready** - Works in containerized n8n environments

## Features

- **High-Quality Neural TTS** using Kokoro-82M model
- **Multiple Voices** - 10+ speaker voices available
- **Adjustable Speed** - 0.5x to 2.0x speech speed control
- **Multiple Output Formats** - WAV or Raw PCM
- **Binary Output** - Audio data as n8n binary property
- **Works in Docker** - Pure WASM, no native dependencies

## Installation

### Option 1: n8n Community Nodes (Recommended)

1. Go to **Settings > Community Nodes**
2. Enter `n8n-nodes-ttsbro`
3. Click **Install**

#### Video Tutorials

| Tutorial | Link |
|----------|------|
| **How to Install TTS Bro Node in n8n** | [![How to Install](https://img.youtube.com/vi/rdHrMLq8-uc/0.jpg)](https://youtu.be/rdHrMLq8-uc) |
| **How to use TTS bro node in n8n** | [![How to Use](https://img.youtube.com/vi/ySEkWTlUGA8/0.jpg)](https://youtu.be/ySEkWTlUGA8) |
| **How to build a selfhosted TTS API** | [![How to build API](https://img.youtube.com/vi/As3JxnDZY6s/0.jpg)](https://youtu.be/As3JxnDZY6s) |

### Option 2: Docker

Use the provided Dockerfile and docker-compose.yml:

```bash
# Download Kokoro model (304MB)
npm run download-model

# Build and run
docker-compose up --build
```

### Option 3: Manual Installation

```bash
# Install the node
cd ~/.n8n/custom
npm install n8n-nodes-ttsbro

# Download the model
cd node_modules/n8n-nodes-ttsbro
npm run download-model

# Restart n8n
```

## Usage

1. Add the **TTS Bro** node to your workflow
2. Configure:
   - **Text**: The text to convert to speech
   - **Voice**: Select a speaker voice (0-9)
   - **Speed**: Speech speed (default: 1.0)
   - **Output Format**: WAV or Raw PCM
   - **Binary Property**: Name for the output (default: "audio")

3. Output is a binary audio file that can be:
   - Saved to disk
   - Uploaded to cloud storage
   - Sent via messaging apps
   - Played in browsers

## Node Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| Text | string | - | Text to synthesize (required) |
| Voice | options | Voice 0 | Speaker voice selection |
| Speed | number | 1.0 | Speech speed (0.5-2.0) |
| Format | options | WAV | Output format (WAV/Raw PCM) |
| Binary Property | string | audio | Output property name |

## Output

```json
{
  "json": {
    "text": "Hello world!",
    "voice": 0,
    "speed": 1.0,
    "format": "wav",
    "sampleRate": 24000,
    "duration": 1.23,
    "byteLength": 54382
  },
  "binary": {
    "audio": { ... }  // Binary audio data
  }
}
```

## Technical Details

- **TTS Engine**: [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) via WebAssembly
- **Model**: Kokoro-82M (English, multi-voice)
- **Sample Rate**: 24000 Hz
- **Bit Depth**: 16-bit
- **Channels**: Mono

## Model Info

The Kokoro model is:
- **82 million parameters** - Compact yet high quality
- **Apache 2.0 licensed** - Free for commercial use
- **Multi-voice** - Multiple speaker styles
- **English focused** - Optimized for English text

## Requirements

- Node.js >= 18
- n8n >= 1.0.0
- ~150MB disk space for model files

## Development

```bash
# Clone and install
git clone https://github.com/your-username/n8n-nodes-ttsbro.git
cd n8n-nodes-ttsbro
npm install

# Download model
npm run download-model

# Build
npm run build

# Run with n8n
npm run start
```

## Legal & License

This project is licensed under the **Apache License 2.0**.

> [!IMPORTANT]
> This distribution includes components and models with different licenses.
> Please see the **[NOTICE](NOTICE)** file for full third-party attribution and license details.

### Third-Party Components

| Component | License | Notes |
|-----------|---------|-------|
| **[sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)** | Apache 2.0 | TTS inference engine |
| **[Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M)** | Apache 2.0 | TTS Model weights |
| **[ONNX Runtime](https://github.com/microsoft/onnxruntime)** | MIT | Neural network inference runtime |
| **[eSpeak NG](https://github.com/espeak-ng/espeak-ng)** | GPL v3 | Data/Phonemes used by the model |

> **Note on GPL Compatibility:** The Kokoro model utilizes data derived from eSpeak NG (GPL v3). If you modify and redistribute the model files or this package, you must comply with the terms of the GPL v3 where applicable.

## Credits

- **[sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)** - For the amazing WebAssembly TTS engine.
- **[hexgrad](https://huggingface.co/hexgrad)** - For training and releasing the Kokoro model.
- **[n8n](https://n8n.io)** - For the workflow automation platform.

## See Also

- [sherpa-onnx Documentation](https://k2-fsa.github.io/sherpa/onnx/index.html)
- [Kokoro Model on HuggingFace](https://huggingface.co/hexgrad/Kokoro-82M)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)
