import type {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';
import * as path from 'path';

// Available voices for Kokoro-en-v0_19 model (11 speakers)
// Speaker ID to name mapping from sherpa-onnx documentation
const VOICES = [
    { name: 'AF - Default (American Female)', value: '0' },
    { name: 'Bella (American Female)', value: '1' },
    { name: 'Nicole (American Female)', value: '2' },
    { name: 'Sarah (American Female)', value: '3' },
    { name: 'Sky (American Female)', value: '4' },
    { name: 'Adam (American Male)', value: '5' },
    { name: 'Michael (American Male)', value: '6' },
    { name: 'Emma (British Female)', value: '7' },
    { name: 'Isabella (British Female)', value: '8' },
    { name: 'George (British Male)', value: '9' },
    { name: 'Lewis (British Male)', value: '10' },
];

// Singleton TTS instance for fast subsequent calls
let ttsInstance: any = null;
let modelDir: string = '';

/**
 * Create WAV file buffer from Float32Array audio samples
 */
function createWavBuffer(samples: Float32Array, sampleRate: number): Buffer {
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples.length * bytesPerSample;
    const buffer = Buffer.alloc(44 + dataSize);

    // RIFF header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);

    // fmt chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // fmt chunk size
    buffer.writeUInt16LE(1, 20);  // audio format (PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);

    // data chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Write audio samples as 16-bit PCM
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        const sample = s < 0 ? s * 0x8000 : s * 0x7FFF;
        buffer.writeInt16LE(Math.round(sample), offset);
        offset += 2;
    }

    return buffer;
}

export class TtsBro implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'TTS Bro',
        name: 'ttsBro',
        icon: 'file:ttsbro.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["voice"]}}',
        description: 'Text-to-Speech using sherpa-onnx Kokoro model (pure WASM)',
        defaults: {
            name: 'TTS Bro',
        },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
            {
                displayName: 'Text',
                name: 'text',
                type: 'string',
                default: '',
                required: true,
                placeholder: 'Enter text to synthesize...',
                description: 'The text to convert to speech',
                typeOptions: {
                    rows: 4,
                },
            },
            {
                displayName: 'Voice',
                name: 'voice',
                type: 'options',
                options: VOICES,
                default: '0',
                description: 'Voice/Speaker ID to use for speech synthesis',
            },
            {
                displayName: 'Speed',
                name: 'speed',
                type: 'number',
                default: 1.0,
                description: 'Speech speed (0.5 = half speed, 2.0 = double speed)',
                typeOptions: {
                    minValue: 0.5,
                    maxValue: 2.0,
                    numberPrecision: 1,
                },
            },
            {
                displayName: 'Output Format',
                name: 'format',
                type: 'options',
                options: [
                    { name: 'WAV', value: 'wav' },
                    { name: 'Raw PCM', value: 'raw' },
                ],
                default: 'wav',
                description: 'Audio output format',
            },
            {
                displayName: 'Binary Property',
                name: 'binaryPropertyName',
                type: 'string',
                default: 'audio',
                description: 'Name of the binary property to store the audio data',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        // Initialize TTS engine once (optimization)
        if (!ttsInstance) {
            // sherpa-onnx works in Node.js via WebAssembly!
            const sherpa_onnx = require('sherpa-onnx');
            const fs = require('fs');

            // Helper to find package root by walking up
            const findPackageRoot = (startPath: string): string => {
                let current = startPath;
                // Walk up up to 5 levels to avoid infinite loops or root access issues
                for (let i = 0; i < 5; i++) {
                    if (fs.existsSync(path.join(current, 'package.json'))) {
                        try {
                            const pkg = JSON.parse(fs.readFileSync(path.join(current, 'package.json'), 'utf8'));
                            if (pkg.name === 'n8n-nodes-ttsbro') return current;
                        } catch (e) { }
                    }
                    const parent = path.dirname(current);
                    if (parent === current) break;
                    current = parent;
                }
                return '';
            };

            const pkgRoot = findPackageRoot(__dirname);

            // Model directory - look for it in multiple locations
            const possiblePaths = [
                // Dynamic Package Root
                pkgRoot ? path.join(pkgRoot, 'kokoro-int8-en-v0_19') : '',
                // Standard n8n community nodes path (npm install location)
                '/home/node/.n8n/nodes/node_modules/n8n-nodes-ttsbro/kokoro-int8-en-v0_19',
                // NPM Package Root (dist/nodes/TtsBro -> ../../.. -> root)
                path.join(__dirname, '..', '..', '..', 'kokoro-int8-en-v0_19'),
                // Docker container path (custom nodes)
                '/home/node/.n8n/custom/node_modules/n8n-nodes-ttsbro/kokoro-int8-en-v0_19',
                // Relative to compiled dist (dist/nodes/TtsBro -> ../../kokoro-int8-en-v0_19)
                path.join(__dirname, '..', '..', 'kokoro-int8-en-v0_19'),
                // From cwd (development)
                path.join(process.cwd(), 'kokoro-int8-en-v0_19'),
            ].filter(Boolean) as string[];

            for (const p of possiblePaths) {
                try {
                    if (fs.existsSync(path.join(p, 'model.int8.onnx'))) {
                        modelDir = p;
                        break;
                    }
                } catch {
                    // Continue checking
                }
            }

            if (!modelDir) {
                throw new Error(`Kokoro model not found. Checked paths: ${possiblePaths.join(', ')} (Base: ${__dirname})`);
            }

            const offlineTtsKokoroModelConfig = {
                model: path.join(modelDir, 'model.int8.onnx'),
                voices: path.join(modelDir, 'voices.bin'),
                tokens: path.join(modelDir, 'tokens.txt'),
                dataDir: path.join(modelDir, 'espeak-ng-data'),
                lengthScale: 1.0,
            };

            const offlineTtsModelConfig = {
                offlineTtsKokoroModelConfig: offlineTtsKokoroModelConfig,
                numThreads: 1,
                debug: 0,
                provider: 'cpu',
            };

            const offlineTtsConfig = {
                offlineTtsModelConfig: offlineTtsModelConfig,
                maxNumSentences: 1,
            };

            ttsInstance = sherpa_onnx.createOfflineTts(offlineTtsConfig);
        }

        for (let i = 0; i < items.length; i++) {
            try {
                const text = this.getNodeParameter('text', i) as string;
                const voice = this.getNodeParameter('voice', i) as string;
                const speed = this.getNodeParameter('speed', i) as number;
                const format = this.getNodeParameter('format', i) as string;
                const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;

                if (!text || text.trim() === '') {
                    throw new Error('Text parameter is required');
                }

                // Generate audio with sherpa-onnx
                const speakerId = parseInt(voice, 10);
                const audio = ttsInstance.generate({
                    text: text,
                    sid: speakerId,
                    speed: speed,
                });

                // Get audio samples and sample rate
                const samples = audio.samples as Float32Array;
                const sampleRate = audio.sampleRate || 24000; // Kokoro uses 24000 Hz

                // Convert to audio buffer
                let audioBuffer: Buffer;

                if (format === 'wav') {
                    // Create WAV file with proper headers
                    audioBuffer = createWavBuffer(samples, sampleRate);
                } else {
                    // Raw PCM (16-bit signed)
                    const pcmData = new Int16Array(samples.length);
                    for (let j = 0; j < samples.length; j++) {
                        const s = Math.max(-1, Math.min(1, samples[j]));
                        pcmData[j] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                    }
                    audioBuffer = Buffer.from(pcmData.buffer);
                }

                // Create output item with binary data
                const newItem: INodeExecutionData = {
                    json: {
                        text,
                        voice: speakerId,
                        speed,
                        format,
                        sampleRate,
                        duration: samples.length / sampleRate,
                        byteLength: audioBuffer.length,
                    },
                    binary: {
                        [binaryPropertyName]: await this.helpers.prepareBinaryData(
                            audioBuffer,
                            `tts_output.${format === 'wav' ? 'wav' : 'pcm'}`,
                            format === 'wav' ? 'audio/wav' : 'audio/pcm',
                        ),
                    },
                };

                returnData.push(newItem);
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: (error as Error).message,
                        },
                    });
                    continue;
                }
                throw error;
            }
        }

        return [returnData];
    }
}
