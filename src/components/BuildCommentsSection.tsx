"use client";

import EntityCommentsSection from "@/components/EntityCommentsSection";

type Props = {
  buildId: number;
  canComment: boolean;
  commentsApiUrl?: string;
};

export default function BuildCommentsSection({ buildId, canComment, commentsApiUrl }: Props) {
  return (
    <EntityCommentsSection
      commentsApiUrl={commentsApiUrl ?? `/api/builds/${buildId}/comments`}
      canComment={canComment}
    />
  );
}
