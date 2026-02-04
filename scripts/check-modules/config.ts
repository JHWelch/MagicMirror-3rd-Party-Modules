import path from "node:path";
import process from "node:process";
import { readFile } from "node:fs/promises";

export type CheckGroupConfig = {
  groups: {
    fast: boolean;
    deep: boolean;
  };
  integrations: {
    npmCheckUpdates: boolean;
    npmDeprecatedCheck: boolean;
    eslint: boolean;
    ghSlimify: boolean;
  };
}
export type PartialCheckGroupConfig = {
  groups: Partial<CheckGroupConfig["groups"]>;
  integrations: Partial<CheckGroupConfig["integrations"]>;
}
type CandidateKind = "default" | "local";
type Candidate = {
  path: string;
  kind: CandidateKind;
};
export type ConfigSource = Candidate & {
  applied: boolean;
  missing?: boolean;
};
export type ConfigError = Candidate & {
  error: Error;
};

export const DEFAULT_CHECK_GROUP_CONFIG: Readonly<CheckGroupConfig> = Object.freeze({
  groups: Object.freeze({
    fast: true,
    deep: true
  }),
  integrations: Object.freeze({
    npmCheckUpdates: true,
    npmDeprecatedCheck: true,
    eslint: true,
    ghSlimify: true
  })
});

function createMutableConfig(): CheckGroupConfig {
  return {
    groups: {
      fast: DEFAULT_CHECK_GROUP_CONFIG.groups.fast,
      deep: DEFAULT_CHECK_GROUP_CONFIG.groups.deep
    },
    integrations: {
      npmCheckUpdates: DEFAULT_CHECK_GROUP_CONFIG.integrations.npmCheckUpdates,
      npmDeprecatedCheck: DEFAULT_CHECK_GROUP_CONFIG.integrations.npmDeprecatedCheck,
      eslint: DEFAULT_CHECK_GROUP_CONFIG.integrations.eslint,
      ghSlimify: DEFAULT_CHECK_GROUP_CONFIG.integrations.ghSlimify
    }
  };
}

function normalizePartial(input: unknown): PartialCheckGroupConfig {
  const normalized: PartialCheckGroupConfig = {
    groups: {},
    integrations: {}
  };

  if (!input || typeof input !== "object") {
    return normalized;
  }

  const rawGroups = 'groups' in input ? input.groups : undefined;
  if (rawGroups && typeof rawGroups === "object") {
    if ('fast' in rawGroups && typeof rawGroups.fast === "boolean") {
      normalized.groups.fast = rawGroups.fast;
    }
    if ('deep' in rawGroups && typeof rawGroups.deep === "boolean") {
      normalized.groups.deep = rawGroups.deep;
    }
  }

  const rawIntegrations = 'integrations' in input ? input.integrations : undefined;
  if (rawIntegrations && typeof rawIntegrations === "object") {
    if ('npmCheckUpdates' in rawIntegrations && typeof rawIntegrations.npmCheckUpdates === "boolean") {
      normalized.integrations.npmCheckUpdates
        = rawIntegrations.npmCheckUpdates;
    }
    if ('npmDeprecatedCheck' in rawIntegrations && typeof rawIntegrations.npmDeprecatedCheck === "boolean") {
      normalized.integrations.npmDeprecatedCheck
        = rawIntegrations.npmDeprecatedCheck;
    }
    if ('eslint' in rawIntegrations && typeof rawIntegrations.eslint === "boolean") {
      normalized.integrations.eslint = rawIntegrations.eslint;
    }
    if ('ghSlimify' in rawIntegrations && typeof rawIntegrations.ghSlimify === "boolean") {
      normalized.integrations.ghSlimify = rawIntegrations.ghSlimify;
    }
  }

  return normalized;
}

function applyPartialConfig(
  target: CheckGroupConfig,
  partial: PartialCheckGroupConfig
): CheckGroupConfig {
  if (partial.groups.fast !== undefined) {
    target.groups.fast = partial.groups.fast;
  }
  if (partial.groups.deep !== undefined) {
    target.groups.deep = partial.groups.deep;
  }

  if (partial.integrations.npmCheckUpdates !== undefined) {
    target.integrations.npmCheckUpdates = partial.integrations.npmCheckUpdates;
  }
  if (partial.integrations.npmDeprecatedCheck !== undefined) {
    target.integrations.npmDeprecatedCheck
      = partial.integrations.npmDeprecatedCheck;
  }
  if (partial.integrations.eslint !== undefined) {
    target.integrations.eslint = partial.integrations.eslint;
  }
  if (partial.integrations.ghSlimify !== undefined) {
    target.integrations.ghSlimify = partial.integrations.ghSlimify;
  }

  return target;
}

function freezeConfig(config: CheckGroupConfig): Readonly<CheckGroupConfig> {
  return Object.freeze({
    groups: Object.freeze({
      fast: config.groups.fast,
      deep: config.groups.deep
    }),
    integrations: Object.freeze({
      npmCheckUpdates: config.integrations.npmCheckUpdates,
      npmDeprecatedCheck: config.integrations.npmDeprecatedCheck,
      eslint: config.integrations.eslint,
      ghSlimify: config.integrations.ghSlimify
    })
  });
}

export async function loadCheckGroupConfig(
  { projectRoot }: { projectRoot?: string } = {}
): Promise<{
  config: Readonly<CheckGroupConfig>;
  sources: ConfigSource[];
  errors: ConfigError[];
}> {
  const overrideRoot = process.env.CHECK_MODULES_CONFIG_ROOT;
  let root;
  if (overrideRoot) {
    root = path.resolve(overrideRoot);
  }
  else if (projectRoot) {
    root = path.resolve(projectRoot);
  }
  else {
    root = process.cwd();
  }
  const configDir = path.join(root, "scripts", "check-modules");
  const basePath = path.join(configDir, "check-groups.config.json");
  const localPath = path.join(configDir, "check-groups.config.local.json");

  const mutableConfig = createMutableConfig();
  const sources = [];
  const errors = [];

  const candidates: Candidate[] = [
    { path: basePath, kind: "default" },
    { path: localPath, kind: "local" }
  ];

  for (const candidate of candidates) {
    try {
      const contents = await readFile(candidate.path, "utf8");
      const parsed = JSON.parse(contents);
      const partial = normalizePartial(parsed);
      applyPartialConfig(mutableConfig, partial);
      sources.push({ ...candidate, applied: true });
    }
    catch (error: unknown) {
      if (error && typeof error === 'object' && "code" in error && error.code === "ENOENT") {
        sources.push({ ...candidate, applied: false, missing: true });
      }
      else {
        const normalizedError
          = error instanceof Error ? error : new Error(String(error));
        errors.push({ ...candidate, error: normalizedError });
      }
    }
  }

  return {
    config: freezeConfig(mutableConfig),
    sources,
    errors
  };
}
