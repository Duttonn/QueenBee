
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import yaml from 'js-yaml';
import { Paths } from './Paths';

const CONFIG_DIR = Paths.getCodexHome();
const CONFIG_FILE = Paths.getConfigPath();

export interface ModelConfig {
    name: string;
    provider: string; // 'openai' | 'mistral' | 'ollama' | 'anthropic' etc
    model: string;
    apiBase?: string;
    roles?: string[]; // 'chat' | 'edit' | 'apply' | 'autocomplete'
    capabilities?: string[]; // 'tool_use'
    systemMessage?: string;
    defaultCompletionOptions?: {
        contextLength?: number;
        temperature?: number;
        maxTokens?: number;
        topP?: number;
        stream?: boolean;
    };
    autocompleteOptions?: {
        maxPromptTokens?: number;
        onlyMyCode?: boolean;
        maxSuffixPercentage?: number;
        prefixPercentage?: number;
    };
    requestOptions?: {
        headers?: Record<string, string>;
    };
}

export interface MCPConfig {
    transport: {
        type: 'stdio';
        command: string;
        args: string[];
        env?: Record<string, string>;
    };
}

export interface QueenBeeConfig {
    name?: string;
    version?: string;
    models: ModelConfig[];
    experimental?: {
        modelContextProtocolServers?: MCPConfig[];
    };
    index?: {
        embedModel?: string;
        paths?: string[];
    };
    context?: Array<{ provider: string }>;
}

export class ConfigManager {
    static async getConfig(): Promise<QueenBeeConfig> {
        try {
            await fs.ensureDir(CONFIG_DIR);

            if (!await fs.pathExists(CONFIG_FILE)) {
                // Initialize with user provided default
                const initial: QueenBeeConfig = {
                    name: "visionOS Expert",
                    version: "1.0.0",
                    models: [
                        {
                            name: "visionOS Expert",
                            provider: "openai",
                            apiBase: "https://dsext001-eu1-215dsi0708-devassistant.3dexperience.3ds.com/v1",
                            model: "openai/gpt-oss-120b",
                            roles: ["chat", "edit", "apply"],
                            capabilities: ["tool_use"],
                            systemMessage: `You are a Senior visionOS Engineer with access to powerful MCP tools.

**Spatial Observer (visionOS Simulator):**
- list_spatial_entities() - Get RealityKit scene graph
- capture_simulator_screenshot() - Take screenshot
- analyze_spatial_view(prompt, provider) - AI vision analysis
- click_3d_entity(entity_name) - Click on 3D entity
- update_camera_pose(x,y,z,qw,qx,qy,qz) - Set camera
- load_spatial_dump(file_path) - Load scene JSON

**Knowledge & Search:**
- search_visionos_docs(query) - Search local visionOS docs
- search_web(query) - Web search
- load_url(url) - Load any URL
- search_github(query, language) - Search GitHub repos

ALWAYS use these tools to verify information and interact with the simulator.`,
                            defaultCompletionOptions: {
                                contextLength: 130000,
                                temperature: 0.1,
                                maxTokens: 8192
                            },
                            requestOptions: {
                                headers: {
                                    Cookie: "session_sda=0d425cf4-324d-4674-b92f-9894e0cab0a0"
                                }
                            }
                        },
                        {
                            name: "Devstral (Dassault)",
                            provider: "mistral",
                            apiBase: "https://dsext001-eu1-215dsi0708-devassistant.3dexperience.3ds.com/v1",
                            model: "mistralai/devstral-medium-2507",
                            requestOptions: {
                                headers: {
                                    Cookie: "session_sda=66725bba-dc18-4d44-9aa8-41d41f15633a"
                                }
                            }
                        },
                        {
                            name: "Nomic Embed",
                            provider: "ollama",
                            model: "nomic-embed-text:latest"
                        }
                    ],
                    experimental: {
                        modelContextProtocolServers: [
                            {
                                transport: {
                                    type: "stdio",
                                    command: "/usr/local/bin/python3",
                                    args: [path.join(os.homedir(), ".continue/mcp-server/server.py")],
                                    env: {
                                        NVIDIA_API_KEY: "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"
                                    }
                                }
                            }
                        ]
                    },
                    index: {
                        embedModel: "Nomic Embed",
                        paths: [path.join(os.homedir(), "LLMData/visionos-knowledge/")]
                    },
                    context: [
                        { provider: "file" }, { provider: "code" }, { provider: "codebase" },
                        { provider: "folder" }, { provider: "docs" }, { provider: "currentFile" },
                        { provider: "diff" }, { provider: "open" }, { provider: "os" },
                        { provider: "problems" }, { provider: "terminal" }, { provider: "tree" },
                        { provider: "repo-map" }
                    ]
                };
                await this.saveConfig(initial);
                return initial;
            }

            const raw = await fs.readFile(CONFIG_FILE, 'utf8');
            return yaml.load(raw) as QueenBeeConfig;
        } catch (error) {
            console.error('Failed to read config:', error);
            return { models: [] };
        }
    }

    static async saveConfig(config: QueenBeeConfig) {
        await fs.ensureDir(CONFIG_DIR);
        const dump = yaml.dump(config);
        await fs.writeFile(CONFIG_FILE, dump, { mode: 0o600 });
    }

    static async addModel(model: ModelConfig) {
        const config = await this.getConfig();
        const models = config.models || [];
        // Update if exists by name, else push
        const index = models.findIndex(m => m.name === model.name);
        if (index >= 0) {
            models[index] = model;
        } else {
            models.push(model);
        }
        config.models = models;
        await this.saveConfig(config);
    }
}
