import { createEntityCommentsRouteHandlers } from "@/lib/server/entityComments";

const { GET, POST } = createEntityCommentsRouteHandlers({
  table: "custom_class_comments",
  fkColumn: "custom_class_id",
});

export { GET, POST };
