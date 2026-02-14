import React, { useState, useEffect } from 'react';

interface ModelProfile {
  id: string;
  name: string;
  provider: string;
  model: string;
  capabilities: string[];
  costTier: string;
  weight: number;
  enabled: boolean;
}

interface ModelCouncilConfig {
  profiles: ModelProfile[];
  totalWeight: number;
  fallbackEnabled: boolean;
  complexityRouting: boolean;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export const ModelCouncilSettings: React.FC = () => {
  const [config, setConfig] = useState<ModelCouncilConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/models/config`);
      if (!res.ok) throw new Error('Failed to load config');
      const data = await res.json();
      setConfig(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateWeight = async (id: string, weight: number) => {
    if (!config) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/models/weight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, weight }),
      });
      await loadConfig();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    if (!config) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/models/profile/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      await loadConfig();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      anthropic: 'bg-purple-500',
      openai: 'bg-green-500',
      gemini: 'bg-blue-500',
    };
    return colors[provider] || 'bg-gray-500';
  };

  const getCapabilityBadge = (cap: string) => {
    const badges: Record<string, string> = {
      reasoning: 'bg-purple-100 text-purple-800',
      code: 'bg-blue-100 text-blue-800',
      fast: 'bg-green-100 text-green-800',
      vision: 'bg-yellow-100 text-yellow-800',
      creative: 'bg-pink-100 text-pink-800',
      analysis: 'bg-orange-100 text-orange-800',
    };
    return badges[cap] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return <div className="p-4 text-gray-500">Loading Model Council...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!config) return null;

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Model Council</h2>
      <p className="text-gray-600 mb-6">
        Configure weighted model selection for intelligent task routing. Total: {config.totalWeight}%
      </p>

      <div className="space-y-4">
        {config.profiles.map((profile) => (
          <div key={profile.id} className={`p-4 border rounded-lg ${profile.enabled ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${getProviderColor(profile.provider)}`} />
                <span className="font-semibold">{profile.name}</span>
                <span className="text-sm text-gray-500">{profile.model}</span>
              </div>
              <label className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Enabled</span>
                <input
                  type="checkbox"
                  checked={profile.enabled}
                  onChange={(e) => toggleEnabled(profile.id, e.target.checked)}
                  className="w-4 h-4"
                  disabled={saving}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              {profile.capabilities.map((cap) => (
                <span key={cap} className={`px-2 py-0.5 text-xs rounded ${getCapabilityBadge(cap)}`}>
                  {cap}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Weight: {profile.weight}%</span>
              <input
                type="range"
                min="0"
                max="100"
                value={profile.weight}
                onChange={(e) => updateWeight(profile.id, parseInt(e.target.value))}
                className="flex-1"
                disabled={saving}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Options</h3>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.complexityRouting}
            onChange={async () => {
              await fetch(`${API_BASE}/api/models/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ complexityRouting: !config.complexityRouting }),
              });
              await loadConfig();
            }}
            className="w-4 h-4"
          />
          <span>Enable complexity-based routing (auto-detect task complexity)</span>
        </label>
        <label className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            checked={config.fallbackEnabled}
            onChange={async () => {
              await fetch(`${API_BASE}/api/models/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fallbackEnabled: !config.fallbackEnabled }),
              });
              await loadConfig();
            }}
            className="w-4 h-4"
          />
          <span>Enable automatic fallback on model failure</span>
        </label>
      </div>
    </div>
  );
};

export default ModelCouncilSettings;
