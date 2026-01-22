/**
 * =============================================================================
 * APIKEYSSETTINGS.JSX - Personal API Keys Management Component
 * =============================================================================
 *
 * Allows users to manage Personal API Keys for CLI and programmatic access.
 * Features:
 * - List all API keys
 * - Generate new keys
 * - Revoke existing keys
 * - One-time display of full key on generation
 * - Copy to clipboard functionality
 *
 * =============================================================================
 */

import { useState } from 'react';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Clock,
  Terminal,
  Loader2
} from 'lucide-react';
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from '../../hooks/useApiKeys';
import Skeleton from '../ui/Skeleton';
import BaseModal from '../ui/BaseModal';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useToast } from '../../hooks/useToast';
import { formatDistanceToNow } from 'date-fns';

/**
 * ApiKeysSettings
 * ---------------
 * Main component for API keys management in Settings
 */
export default function ApiKeysSettings() {
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [selectedKeyId, setSelectedKeyId] = useState(null);
  const [generatedKey, setGeneratedKey] = useState(null);

  const { data: keys, isLoading, error } = useApiKeys();
  const { toast } = useToast();

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="w-12 h-12 text-danger mb-3" />
        <h3 className="text-lg font-semibold text-text mb-2">Failed to Load API Keys</h3>
        <p className="text-sm text-muted max-w-md">
          {error.message || 'Unable to fetch your API keys. Please try again later.'}
        </p>
      </div>
    );
  }

  // Empty state
  if (!keys || keys.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-text">API Keys</h2>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Generate New Key
          </button>
        </div>

        <div className="text-center py-12 bg-bg rounded-xl border border-border">
          <Key className="w-16 h-16 text-muted mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-text mb-2">No API Keys Yet</h3>
          <p className="text-sm text-muted mb-6 max-w-md mx-auto">
            Personal API keys allow you to authenticate from CLI tools and scripts without using your session token.
            Generate your first key to get started.
          </p>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Generate Your First Key
          </button>
        </div>

        <WhatAreApiKeys />

        <GenerateKeyModal
          isOpen={showGenerateModal}
          onClose={() => setShowGenerateModal(false)}
          onSuccess={(data) => {
            setGeneratedKey(data);
            setShowGenerateModal(false);
            toast.success('API key generated successfully');
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text">API Keys</h2>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          disabled={keys.length >= 5}
        >
          <Plus className="w-4 h-4" />
          Generate New Key
        </button>
      </div>

      {keys.length >= 5 && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-text">Maximum keys reached</p>
            <p className="text-muted">You've reached the limit of 5 API keys. Revoke an existing key to create a new one.</p>
          </div>
        </div>
      )}

      {/* API Keys List */}
      <div className="space-y-3">
        {keys.map((key) => (
          <ApiKeyCard
            key={key.id}
            apiKey={key}
            onRevoke={() => {
              setSelectedKeyId(key.id);
              setShowRevokeDialog(true);
            }}
          />
        ))}
      </div>

      <WhatAreApiKeys />

      {/* Generated Key Display */}
      {generatedKey && (
        <GeneratedKeyDisplay
          data={generatedKey}
          onClose={() => setGeneratedKey(null)}
        />
      )}

      {/* Modals */}
      <GenerateKeyModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onSuccess={(data) => {
          setGeneratedKey(data);
          setShowGenerateModal(false);
          toast.success('API key generated successfully');
        }}
      />

      <RevokeKeyDialog
        isOpen={showRevokeDialog}
        onClose={() => {
          setShowRevokeDialog(false);
          setSelectedKeyId(null);
        }}
        keyId={selectedKeyId}
        onSuccess={() => {
          toast.success('API key revoked successfully');
        }}
      />
    </div>
  );
}

/**
 * ApiKeyCard
 * ----------
 * Display card for individual API key
 */
function ApiKeyCard({ apiKey, onRevoke }) {
  return (
    <div className="bg-bg rounded-lg border border-border p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-4 h-4 text-primary flex-shrink-0" />
            <h3 className="font-semibold text-text truncate">{apiKey.name}</h3>
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-muted">
              <Terminal className="w-3.5 h-3.5" />
              <code className="font-mono text-xs">{apiKey.prefix}...</code>
            </div>

            <div className="flex items-center gap-2 text-muted">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                Created {formatDistanceToNow(new Date(apiKey.createdAt), { addSuffix: true })}
              </span>
            </div>

            {apiKey.lastUsed && (
              <div className="flex items-center gap-2 text-muted">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Last used {formatDistanceToNow(new Date(apiKey.lastUsed), { addSuffix: true })}
                </span>
              </div>
            )}

            {!apiKey.lastUsed && (
              <div className="flex items-center gap-2 text-muted/60">
                <Clock className="w-3.5 h-3.5" />
                <span className="italic">Never used</span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onRevoke}
          className="px-3 py-1.5 text-sm text-danger hover:bg-danger/10 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Revoke
        </button>
      </div>
    </div>
  );
}

/**
 * GenerateKeyModal
 * ----------------
 * Modal for generating a new API key
 */
function GenerateKeyModal({ isOpen, onClose, onSuccess }) {
  const [keyName, setKeyName] = useState('');
  const { mutate: createKey, isPending } = useCreateApiKey();
  const { toast } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!keyName.trim()) {
      toast.error('Please enter a name for your API key');
      return;
    }

    if (keyName.trim().length > 50) {
      toast.error('Key name cannot exceed 50 characters');
      return;
    }

    createKey(keyName.trim(), {
      onSuccess: (data) => {
        onSuccess(data);
        setKeyName('');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to generate API key');
      },
    });
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Generate New API Key">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="keyName" className="block text-sm font-medium text-text mb-2">
            Key Name
          </label>
          <input
            id="keyName"
            type="text"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="e.g., Claude Code CLI, Mobile App"
            className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            maxLength={50}
            autoFocus
          />
          <p className="text-xs text-muted mt-1">
            Choose a descriptive name to help you identify this key later
          </p>
        </div>

        <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-muted">
              <p className="font-medium text-text">Important</p>
              <p>You'll only see the full API key once. Make sure to copy and save it securely.</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-bg border border-border rounded-lg text-text hover:bg-panel transition-colors"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Key className="w-4 h-4" />
                Generate Key
              </>
            )}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

/**
 * GeneratedKeyDisplay
 * -------------------
 * Shows the full API key once after generation
 */
function GeneratedKeyDisplay({ data, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(data.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-success/10 border border-success/30 rounded-xl p-6">
      <div className="flex items-start gap-3 mb-4">
        <Check className="w-6 h-6 text-success flex-shrink-0" />
        <div>
          <h3 className="text-lg font-semibold text-text mb-1">API Key Generated Successfully</h3>
          <p className="text-sm text-muted">
            Copy your API key now. You won't be able to see it again!
          </p>
        </div>
      </div>

      <div className="bg-bg rounded-lg border border-border p-4 mb-4">
        <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-2">
          Your API Key
        </label>
        <div className="flex items-center gap-2">
          <code className="flex-1 font-mono text-sm text-text bg-panel px-3 py-2 rounded border border-border break-all">
            {data.apiKey}
          </code>
          <button
            onClick={handleCopy}
            className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 flex-shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm mb-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <div className="text-muted">
            <p className="font-medium text-text mb-1">Store this key securely</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Save it in <code className="text-xs bg-panel px-1 rounded">.claude/credentials.json</code></li>
              <li>Never commit it to version control</li>
              <li>If lost, you'll need to generate a new key</li>
            </ul>
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full px-4 py-2 bg-bg border border-border rounded-lg text-text hover:bg-panel transition-colors"
      >
        I've Saved My Key
      </button>
    </div>
  );
}

/**
 * RevokeKeyDialog
 * ---------------
 * Confirmation dialog for revoking an API key
 */
function RevokeKeyDialog({ isOpen, onClose, keyId, onSuccess }) {
  const { mutate: revokeKey, isPending } = useRevokeApiKey();
  const { toast } = useToast();

  const handleRevoke = () => {
    if (!keyId) return;

    revokeKey(keyId, {
      onSuccess: () => {
        onSuccess();
        onClose();
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to revoke API key');
      },
    });
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleRevoke}
      title="Revoke API Key?"
      message="This API key will immediately stop working. Any applications using it will lose access. This action cannot be undone."
      confirmText="Revoke Key"
      confirmVariant="danger"
      isPending={isPending}
    />
  );
}

/**
 * WhatAreApiKeys
 * --------------
 * Informational section about API keys
 */
function WhatAreApiKeys() {
  return (
    <div className="bg-bg rounded-xl border border-border p-6">
      <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
        <Terminal className="w-5 h-5 text-primary" />
        What are API Keys?
      </h3>
      <div className="text-sm text-muted space-y-3">
        <p>
          Personal API keys allow you to authenticate from command-line tools, scripts, and external integrations
          without using your browser session token.
        </p>

        <div className="space-y-2">
          <p className="font-medium text-text">Benefits:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Long-lived credentials (don't expire like session tokens)</li>
            <li>Individually revocable (without logging out)</li>
            <li>Named for easy identification</li>
            <li>Perfect for CLI tools like the <code className="text-xs bg-panel px-1 rounded">/claude-usage</code> skill</li>
          </ul>
        </div>

        <div className="bg-panel rounded-lg p-3">
          <p className="text-xs">
            <strong>Example usage:</strong> Store your API key in <code className="bg-bg px-1 rounded">.claude/credentials.json</code> to
            automatically authenticate when running the <code className="bg-bg px-1 rounded">/claude-usage</code> skill.
          </p>
        </div>
      </div>
    </div>
  );
}
