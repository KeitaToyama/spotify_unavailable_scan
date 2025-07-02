import { supabase } from "../../../lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { data, error } = await supabase
    .from("Track")
    .select("*")
    .eq("user", session.user.id) // Spotifyのusernameに基づいて取得
    .order("createdAt", { ascending: false });

  if (error) {
    console.error("Supabase error:", error);
    return res
      .status(500)
      .json({ error: "Database fetch error", details: error.message });
  }

  return res.status(200).json(data);
}
