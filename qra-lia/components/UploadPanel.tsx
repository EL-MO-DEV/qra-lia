"use client";

import { useRef } from "react";

type UploadPanelProps = {
  onFileChosen: (file: File) => void;
};

/**
 * Home screen: one giant camera button + a smaller gallery link.
 * Two hidden <input type="file"> elements do the actual picking.
 */
export default function UploadPanel({ onFileChosen }: UploadPanelProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileChosen(file);
    // reset so choosing the same file twice still fires onChange
    e.target.value = "";
  }

  return (
    <div className="upload-panel">
      <button
        type="button"
        className="btn btn-primary btn-camera"
        onClick={() => cameraInputRef.current?.click()}
        aria-label="صوّر الورقة"
      >
        <span className="btn-camera-icon" aria-hidden="true">
          📸
        </span>
        <span className="btn-camera-labels">
          <span className="btn-camera-main" dir="rtl">
            صوّر الورقة
          </span>
          <span className="btn-camera-sub" dir="ltr">
            Prendre une photo
          </span>
        </span>
      </button>

      <button
        type="button"
        className="link-gallery"
        onClick={() => galleryInputRef.current?.click()}
      >
        <span aria-hidden="true">🖼️</span>{" "}
        <span dir="rtl">ولا اختار من الصور</span>
        <span className="link-gallery-sub" dir="ltr">
          {" "}
          ou choisir dans la galerie
        </span>
      </button>

      <p className="reassurance" dir="rtl">
        الصورة ما كتحفظش عندنا
        <span className="reassurance-sub" dir="ltr">
          Votre photo n&apos;est pas enregistrée
        </span>
      </p>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        hidden
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        hidden
      />
    </div>
  );
}
