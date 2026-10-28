import { useEffect, useState } from "react";
import { fetchFileBlob } from "../../services/api";

// Shows a private picture (like a doctor's photo). Falls back to the first letter of `name`.
export default function SecureImage({ fileId, name = "", className = "", size = 56 }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (!fileId) return undefined;
    let url = "";
    let cancelled = false;
    fetchFileBlob(fileId)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [fileId]);

  if (src) {
    return (
      <img
        src={src}
        alt={name ? `${name}` : ""}
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-2xl object-cover ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-[#fdf1f4] text-lg font-semibold text-[#d77f97] ${className}`}
    >
      {name?.replace(/^Dr\.?\s*/i, "").charAt(0) || "D"}
    </div>
  );
}