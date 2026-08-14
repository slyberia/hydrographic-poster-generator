import { useCallback, useEffect, useMemo, useState } from "react";
import { publicDroneApi, type ReferenceLayerDefinition } from "@/lib/publicDroneApi";

export type ReferenceLayerKey =
  | "airports" | "runways" | "runway_safeguarding" | "airport_notification"
  | "schools" | "healthcare" | "government" | "police" | "fire";

export type ReferenceLayerData = Record<string, GeoJSON.FeatureCollection>;

export function useReferenceLayers(options: {
  enabledDefaults?: Partial<Record<ReferenceLayerKey, boolean>>;
  allowed?: ReferenceLayerKey[];
}) {
  const [definitions, setDefinitions] = useState<ReferenceLayerDefinition[]>([]);
  const [enabled, setEnabled] = useState<Set<ReferenceLayerKey>>(new Set());
  const [data, setData] = useState<ReferenceLayerData>({});
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(0);
  const allowed = options.allowed;
  const allowedKey = allowed?.join(",") ?? "*";
  const defaultsKey = JSON.stringify(options.enabledDefaults ?? {});

  useEffect(() => {
    void publicDroneApi.getReferenceConfig().then((config) => {
      const defs = config.layers.filter((d) => !allowed || allowed.includes(d.key as ReferenceLayerKey));
      setDefinitions(defs);
      setEnabled(new Set(defs.filter((d) => options.enabledDefaults?.[d.key as ReferenceLayerKey] ?? d.default_enabled).map((d) => d.key as ReferenceLayerKey)));
    }).catch(() => setDefinitions([]));
  }, [allowedKey, defaultsKey]);

  const load = useCallback(async (key: ReferenceLayerKey) => {
    if (data[key] || loading.has(key)) return;
    setLoading((prev) => new Set(prev).add(key));
    try {
      const fc = await publicDroneApi.getReferenceLayer(key);
      setData((prev) => ({ ...prev, [key]: fc }));
    } finally {
      setLoading((prev) => { const next = new Set(prev); next.delete(key); return next; });
    }
  }, [data, loading]);

  useEffect(() => {
    for (const def of definitions) {
      if (enabled.has(def.key as ReferenceLayerKey) && zoom >= def.min_zoom) void load(def.key as ReferenceLayerKey);
    }
  }, [definitions, enabled, load, zoom]);

  const toggle = useCallback((key: ReferenceLayerKey) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const visible = useMemo(() => {
    const output: ReferenceLayerData = {};
    for (const def of definitions) {
      if (enabled.has(def.key as ReferenceLayerKey) && zoom >= def.min_zoom && data[def.key]) output[def.key] = data[def.key];
    }
    return output;
  }, [data, definitions, enabled, zoom]);

  return { definitions, enabled, data, visible, loading, zoom, setZoom, toggle };
}
