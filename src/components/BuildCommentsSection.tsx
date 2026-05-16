"use client";

import EntityCommentsSection from "@/components/EntityCommentsSection";

type Props = {
  buildId: number;
  canComment: boolean;
};

export default function BuildCommentsSection({ buildId, canComment }: Props) {
  return (
    <EntityCommentsSection
      commentsApiUrl={`/api/builds/${buildId}/comments`}
      canComment={canComment}
    />
  );
}
