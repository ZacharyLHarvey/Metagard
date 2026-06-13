"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

/** Matches links, form controls, and explicit opt-outs so row navigation does not steal their clicks. */
const INTERACTIVE_SELECTOR =
  "a[href], button, input, textarea, select, [role='button'], [data-prevent-build-row-nav]";

type Props = {
  buildId: number;
  className?: string;
  hrefPrefix?: string;
  children: ReactNode;
};

/**
 * Table body row: clicking non-interactive areas navigates to `{hrefPrefix}/[id]`.
 */
export default function BuildTableBodyRow({
  buildId,
  className,
  hrefPrefix = "/builds",
  children,
}: Props) {
  const router = useRouter();
  const href = `${hrefPrefix}/${buildId}`;

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
