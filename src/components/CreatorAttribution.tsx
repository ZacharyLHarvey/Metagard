import Link from "next/link";

type Props = {
  ownerId: string | null | undefined;
  displayName: string;
};

/** Creator: {displayName} with optional link to public profile. */
export default function CreatorAttribution({ ownerId, displayName }: Props) {
  if (!ownerId) {
    return (
      <p className="text-sm text-neutral-400">
        <span className="text-neutral-500">Creator:</span> —
      </p>
    );
  }
  return (
    <p className="text-sm text-neutral-400">
      <span className="text-neutral-500">Creator:</span>{" "}
      <Link href={`/profile/${ownerId}`} className="text-neutral-200 hover:underline">
        {displayName}
      </Link>
    </p>
  );
}
