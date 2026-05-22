export type BuildGroupRow = {
  id: number;
  owner_id: string;
  name: string;
  description: string | null;
  average_rating: number | null;
  created_at: string;
};

export type BuildGroupMemberBuild = {
  id: number;
  name: string;
  class: string;
  level: number;
  average_rating: number | null;
  owner_id: string | null;
  look_the_part: boolean;
};
