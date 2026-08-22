import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  publicDroneApi,
  type ReferenceLayerConfig,
  type ReferenceLayerDefinition,
} from "@/lib/publicDroneApi";

export type ReferenceLayerKey =
  | "airports" | "runways" | "runway_safeguarding" | "airport_notification"
  | "schools" | "healthcare" | "government" | "police" | "fire";

export type ReferenceLayerData = Record<string, GeoJSON.FeatureCollection>;

export function scaleLabelForZoom(zoom: number): string {
  if (zoom <= 8) return "Regional";
  if (zoom <= 11) return "City";
  if (zoom <= 14) return "Neighbourhood";
  return "Site";
}

export function partitionReferenceDataset(
  dataset: GeoJSON.FeatureCollection,
  definitions: ReferenceLayerDefinition[],
): ReferenceLayerData {
  const output = Object.fromEntries(definitions.map((definition) => [
    definition.key,
    { type: "FeatureCollection", features: [] } as GeoJSON.FeatureCollection,
  ]));
  for (const feature of dataset.features) {
    const key = feature.properties?.reference_layer_key;
    if (typeof key === "string" && output[key]) output[key].features.push(feature);
  }
  return output;
}

export function useReferenceLayers(options: {
  enabledDefaults?: Partial<Record<ReferenceLayerKey, boolean>>;
  allowed?: ReferenceLayerKey[];
  preferArtifact?: boolean;
}) {
  const [config, setConfig] = useState<ReferenceLayerConfig | null>(null);
  const [definitions, setDefinitions] = useState<ReferenceLayerDefinition[]>([]);
  const [enabled, setEnabled] = useState<Set<ReferenceLayerKey>>(new Set());
  const [data, setData] = useState<ReferenceLayerData>({});
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [zoom, setZoom] = useState(0);
  const [artifactState, setArtifactState] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");
  const artifactRequestStarted = useRef(false);

  const allowedKey = options.allowed?.join(",") ?? "*";
  const defaultsKey = JSON.stringify(options.enabledDefaults ?? {});
  const preferArtifact = options.preferArtifact ?? true;
  const allowed = useMemo(
    () => allowedKey === "*" ? null : new Set(allowedKey.split(",") as ReferenceLayerKey[]),
    [allowedKey],
  );
  const enabledDefaults = useMemo(
    () => JSON.parse(defaultsKey) as Partial<Record<ReferenceLayerKey, boolean>>,
    [defaultsKey],
  );

  useEffect(() => {
    void publicDroneApi.getReferenceConfig().then((nextConfig) => {
      const defs = nextConfig.layers.filter((definition) =>
        !allowed || allowed.has(definition.key as ReferenceLayerKey));
      setConfig(nextConfig);
      setDefinitions(defs);
      setEnabled(new Set(defs
        .filter((definition) => definition.available !== false)
        .filter((definition) => enabledDefaults[definition.key as ReferenceLayerKey] ?? definition.default_enabled)
        .map((definition) => definition.key as ReferenceLayerKey)));
    }).catch(() => setDefinitions([]));
  }, [allowed, enabledDefaults]);

  const loadDynamic = useCallback(async (key: ReferenceLayerKey) => {
    if (data[key] || loading.has(key) || errors[key]) return;
    setLoading((previous) => new Set(previous).add(key));
    try {
      const collection = await publicDroneApi.getReferenceLayer(key, config?.version);
      setData((previous) => ({ ...previous, [key]: collection }));
    } catch {
      setErrors((previous) => ({ ...previous, [key]: "Unavailable. Toggle to retry." }));
    } finally {
      setLoading((previous) => {
        const next = new Set(previous);
        next.delete(key);
        return next;
      });
    }
  }, [config, data, errors, loading]);

  useEffect(() => {
    const needed = definitions.filter((definition) =>
      definition.available !== false
      && enabled.has(definition.key as ReferenceLayerKey)
      && zoom >= definition.min_zoom
      && !data[definition.key]);
    if (!needed.length) return;

    if (preferArtifact && config?.manifest_url && artifactState === "idle" && !artifactRequestStarted.current) {
      artifactRequestStarted.current = true;
      void Promise.resolve().then(() => {
        setArtifactState("loading");
        setLoading((previous) => {
          const next = new Set(previous);
          needed.forEach((definition) => next.add(definition.key));
          return next;
        });
        return publicDroneApi.getReferenceManifest(config.manifest_url!);
      }).then((manifest) => publicDroneApi.getReferenceDataset(manifest))
        .then((dataset) => {
          setData((previous) => ({ ...previous, ...partitionReferenceDataset(dataset, definitions) }));
          setArtifactState("ready");
        })
        .catch(() => setArtifactState("unavailable"))
        .finally(() => setLoading(new Set()));
      return;
    }

    if (!preferArtifact || !config?.manifest_url || artifactState === "unavailable") {
      needed.forEach((definition) => {
        void Promise.resolve().then(() => loadDynamic(definition.key as ReferenceLayerKey));
      });
    }
  }, [artifactState, config?.manifest_url, data, definitions, enabled, loadDynamic, preferArtifact, zoom]);

  const toggle = useCallback((key: ReferenceLayerKey) => {
    if (definitions.find((definition) => definition.key === key)?.available === false) return;
    setErrors((previous) => {
      if (!previous[key]) return previous;
      return Object.fromEntries(Object.entries(previous).filter(([errorKey]) => errorKey !== key));
    });
    setEnabled((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, [definitions]);

  const visible = useMemo(() => {
    const output: ReferenceLayerData = {};
    for (const definition of definitions) {
      if (
        definition.available !== false
        && enabled.has(definition.key as ReferenceLayerKey)
        && zoom >= definition.min_zoom
        && data[definition.key]
      ) output[definition.key] = data[definition.key];
    }
    return output;
  }, [data, definitions, enabled, zoom]);

  return {
    definitions, enabled, data, visible, loading, errors, zoom, setZoom, toggle,
    source: preferArtifact && artifactState === "ready" ? "artifact" as const : "dynamic" as const,
  };
}
