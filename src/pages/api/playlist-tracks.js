import { getSession } from "next-auth/react";

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session || !session.user.accessToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { playlistId } = req.query;
  if (!playlistId) {
    return res.status(400).json({ error: "Missing playlist ID" });
  }

  try {
    let allUnplayableTracks = [];
    let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?market=JP`;

    while (nextUrl) {
      const response = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${session.user.accessToken}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message || "Failed to fetch playlist tracks"
        );
      }

      // is_playable が false のトラックのみを抽出
      const unplayableTracks = data.items.filter(
        (item) => item.track && item.track.is_playable === false
      );

      allUnplayableTracks = [...allUnplayableTracks, ...unplayableTracks];
      nextUrl = data.next; // 次のページのURLを取得（なければnull）
    }

    console.log("再生不可のトラック:", allUnplayableTracks);
    res.status(200).json(allUnplayableTracks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
