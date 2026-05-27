import Image from "next/image";

export type ProfileBadge = {
  src: string;
  alt: string;
  label: string;
  requirement: string;
  width: number;
  height: number;
};

export default function ProfileBadgesSection({ badges }: { badges: ProfileBadge[] }) {
  return (
    <section className="space-y-4 border border-neutral-800 rounded-lg p-4">
      <div>
        <h2 className="text-lg font-semibold">Profile Badges</h2>
        <p className="text-sm text-neutral-500">Badges earned from activity and achievements.</p>
      </div>

      {badges.length === 0 ? (
        <p className="text-sm text-neutral-500">No badges yet.</p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {badges.map((badge) => (
            <li key={badge.src} className="flex flex-col items-center gap-1.5">
              <Image
                src={badge.src}
                alt={badge.alt}
                width={badge.width}
                height={badge.height}
                className="h-auto w-auto"
                unoptimized
              />
              <div className="text-center space-y-0.5 max-w-[10rem]">
                <div className="text-sm text-neutral-200">{badge.label}</div>
                <div className="text-xs text-neutral-500">{badge.requirement}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

