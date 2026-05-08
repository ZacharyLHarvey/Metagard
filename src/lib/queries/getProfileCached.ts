import { cache } from "react";
import { getProfile } from "@/lib/queries/getProfile";

/** One Supabase profile read per request (layout, metadata, loading, etc.). */
export const getProfileCached = cache(getProfile);
