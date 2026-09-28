import Image from "next/image";

/** Qra Lia logo: the app icon (a paper that talks to you), same art as the home-screen icon. */
export default function BrandMark({ className = "brand-mark", size = 40 }: { className?: string; size?: number }) {
  return <Image className={className} src="/icon-192.png" width={size} height={size} alt="" aria-hidden="true" priority />;
}
