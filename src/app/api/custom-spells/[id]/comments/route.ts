import { createEntityCommentsRouteHandlers } from "@/lib/server/entityComments";

const { GET, POST } = createEntityCommentsRouteHandlers({
  table: "custom_spell_comments",
  fkColumn: "custom_spell_id",
});

export { GET, POST };
