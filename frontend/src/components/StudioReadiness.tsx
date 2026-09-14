"use client";
import { useEffect, useRef } from "react";

export default function StudioReadiness({ ready, error, onRetry }: {
  ready: boolean; error: string | null; onRetry: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    try { if (!sessionStorage.getItem("hydro:studio-guide-v14")) dialog.current?.showModal(); }
    catch { dialog.current?.showModal(); }
  }, []);
  function close() {
    try { sessionStorage.setItem("hydro:studio-guide-v14", "seen"); } catch { /* Storage is optional. */ }
    dialog.current?.close();
  }
  return <div className="m-3 space-y-2 text-sm">
    <p role="status">{error ? "Studio could not load its geography and style choices." : ready ? "Studio is ready." : "Loading geography and style choices…"}</p>
    {error && <button className="btn-secondary" onClick={onRetry}>Retry loading Studio</button>}
    <button className="btn-secondary" onClick={() => dialog.current?.showModal()}>Studio guide</button>
    <dialog ref={dialog} aria-labelledby="studio-guide-title" className="studio-guide georef-panel p-6" onCancel={close}>
      <h2 id="studio-guide-title" className="text-2xl font-semibold">Welcome to Studio</h2>
      <p className="mt-3">Choose a geography and style once loading finishes, review the preview, then download or open a poster in the Georeferencer.</p>
      <p className="mt-3">New in Phase 14: direct poster transfer and a larger Geographic Inspection tab.</p>
      <p className="mt-3">Transfers expire after five minutes. Browser copies are cleared when opened or when you next visit Studio or the Georeferencer after expiry. Expired or already opened transfers can be prepared again in Studio. Image processing is temporary; provenance and quality metadata are saved. Download results to keep them.</p>
      <p className="mt-3">Reference-network agreement is not surveyed geographic accuracy. Review alignment evidence and source limitations before using a result.</p>
      <p role="status" className="mt-3">{ready ? "Geography and styles are ready." : error ? "Loading failed. Close this guide and retry." : "Loading geography and styles…"}</p>
      <button className="btn-primary mt-4" onClick={close}>Continue to Studio</button>
    </dialog>
  </div>;
}
