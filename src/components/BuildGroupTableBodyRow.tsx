"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

const INTERACTIVE_SELECTOR =
  "a[href], button, input, textarea, select, [role='button'], [data-prevent-build-group-row-nav]";

type Props = {
  groupId: number;
  className?: string;
  children: ReactNode;
};

export default function BuildGroupTableBodyRow({ groupId, className, children }: Props) {
  const router = useRouter();
  const href = `/build-groups/${groupId}`;

  function handleClick(e: MouseEvent<HTMLTableRowElement>) {
    if ((e.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) return;
    router.push(href);
  }

  return (
    <tr
      className={[className, "cursor-pointer"].filter(Boolean).join(" ")}
      onClick={handleClick}
    >
      {children}
    </tr>
  );
}
