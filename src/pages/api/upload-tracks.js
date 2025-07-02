import { supabase } from "../../../lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { tracks } = req.body;
  if (!tracks || !Array.isArray(tracks)) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const formattedTracks = tracks.map((track) => ({
    id: uuidv4(), // UUIDを生成してidを明示的に指定
    user: session.user.id, // Spotifyのユーザー名
    name: track.name,
    artist: track.artist, // ARRAY型に対応
    album: track.album,
    url: track.url,
    playlistId: track.playlistId,
    isPlayable: track.isPlayable,
    image_url: track.image_url,
    createdAt: new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }), // JSTで保存
    updatedAt: new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }),
  }));

  const { data, error } = await supabase.from("Track").insert(formattedTracks);

  if (error) {
    console.error("Database insert error:", error);
    return res
      .status(500)
      .json({ error: "Database insert error", details: error.message });
  }

  return res
    .status(200)
    .json({ message: "Tracks uploaded successfully", data });
}
