import { createEntityCommentsRouteHandlers } from "@/lib/server/entityComments";

const { GET, POST } = createEntityCommentsRouteHandlers({
  table: "custom_build_comments",
  fkColumn: "custom_build_id",
});

export { GET, POST };
