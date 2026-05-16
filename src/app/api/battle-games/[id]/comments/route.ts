import { createEntityCommentsRouteHandlers } from "@/lib/server/entityComments";

const { GET, POST } = createEntityCommentsRouteHandlers({
  table: "battle_game_comments",
  fkColumn: "battle_game_id",
});

export { GET, POST };
