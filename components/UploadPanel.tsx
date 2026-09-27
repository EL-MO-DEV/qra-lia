"use client";

import { useRef } from "react";
import { useLang } from "@/lib/i18n";

type UploadPanelProps = {
  onFileChosen: (file: File) => void;
};

/**
 * The main action: one giant camera button + a gallery option.
 * Two hidden <input type="file"> elements do the actual picking.
 */
export default function UploadPanel({ onFileChosen }: UploadPanelProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLang();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileChosen(file);
    // reset so choosing the same file twice still fires onChange
    e.target.value = "";
  }

  return (
    <div className="upload-panel">
      <button type="button" className="btn-camera" onClick={() => cameraInputRef.current?.click()}>
        <span className="btn-camera-icon" aria-hidden="true">
          📸
        </span>
        <span>
          <span className="btn-camera-main">{t("takePhoto")}</span>
          <span className="btn-camera-sub" lang="fr">
            Prendre une photo
          </span>
        </span>
        <span className="btn-camera-arrow" aria-hidden="true">
          <span className="flip-ltr">←</span>
        </span>
      </button>

      <button type="button" className="link-gallery" onClick={() => galleryInputRef.current?.click()}>
        <span aria-hidden="true">🖼️</span>
        <span>{t("fromGallery")}</span>
        <span className="fr" lang="fr">
          ou depuis la galerie
        </span>
      </button>

      <p className="reassurance">
        <span aria-hidden="true">🔒</span>
        <span>{t("notStored")}</span>
        <span className="fr" lang="fr">
          Votre photo n&apos;est pas enregistrée
        </span>
      </p>

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleChange} hidden />
      <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleChange} hidden />
    </div>
  );
}
