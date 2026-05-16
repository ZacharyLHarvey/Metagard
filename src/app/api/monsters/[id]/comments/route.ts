import { createEntityCommentsRouteHandlers } from "@/lib/server/entityComments";

const { GET, POST } = createEntityCommentsRouteHandlers({
  table: "monster_comments",
  fkColumn: "monster_id",
});

export { GET, POST };
