import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import { supabase } from "./supabaseClient";
import {
  Play,
  Pause,
  Search,
  Heart,
  User,
  SkipBack,
  SkipForward,
  Volume2,
  X,
  List,
  Plus,
} from "lucide-react";

/* sampleTracks - removed default tracks per request */
const sampleTracks = [];

// Local fallback cover path (your uploaded file — we use this local path as requested)
const FALLBACK_COVER = "/mnt/data/Screenshot 2025-11-25 at 10.04.22 PM.png";
// Local debug sample image (unused but kept)
const SAMPLE_IMAGE_PATH = "/mnt/data/Screenshot 2025-11-25 at 11.44.19 PM.png";

// Backend server base
const SERVER = "http://localhost:4000";

export default function MainHomePage() {
  // Core state
  const [library, setLibrary] = useState(sampleTracks);
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(new Set());
  const audioRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const volumeBeforeMuteRef = useRef(0.9);
  const [showNowPlaying, setShowNowPlaying] = useState(false);

  // Playlists + modal
  const [playlists, setPlaylists] = useState([]);
  const [playlistModal, setPlaylistModal] = useState({
    open: false,
    addingTrack: null,
  });
  const [newPlaylistName, setNewPlaylistName] = useState("");

  // internal route (home / playlist / favourites)
  const [route, setRoute] = useState({ name: "home", data: null });

  // socket ref
  const socketRef = useRef(null);

  // router
  const navigate = useNavigate();

  // ---- fetch tracks on mount ----
  useEffect(() => {
    async function fetchTracks() {
      try {
        const res = await fetch(`${SERVER}/api/tracks`);
        const data = await res.json();

        if (data.tracks) {
          const mapped = data.tracks.map((t) => ({
            id: t.id,
            title: t.title,
            artist: t.artist_name || t.artist || "Unknown Artist",
            uploader: t.uploader_name || "Unknown uploader",
            src: t.public_url,
            cover: t.cover_url || FALLBACK_COVER,
            created_at: t.created_at,
          }));

          setLibrary(mapped);

          // set first track as current if none
          if (!current && mapped.length > 0) {
            const first = mapped[0];
            setCurrent(first);
          }
        }
      } catch (err) {
        console.error("Failed to fetch tracks:", err);
      }
    }

    fetchTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- fetch playlists ----
  useEffect(() => {
    let mounted = true;
    async function fetchPlaylists() {
      try {
        let token = "";
        try {
          const { data } = await supabase.auth.getSession();
          token = data?.session?.access_token || "";
        } catch (e) {
          token = "";
        }

        const res = await fetch(`${SERVER}/api/playlists`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          console.warn("Could not fetch playlists:", res.status);
          return;
        }
        const json = await res.json();
        const items = json.playlists || json;
        if (!mounted) return;

        setPlaylists(
          items.map((p) => ({
            id: p.id,
            name: p.name,
            trackIds: (p.tracks || [])
              .map((t) => t.track_id || t.id)
              .filter(Boolean),
          }))
        );
      } catch (err) {
        console.warn("Fetch playlists error:", err);
      }
    }
    fetchPlaylists();
    return () => {
      mounted = false;
    };
  }, []);

  /* ===== audio init (runs once) ===== */
  useEffect(() => {
    const a = new Audio();
    a.preload = "metadata";
    a.volume = volume;
    audioRef.current = a;

    const onTime = () => {
      const dur = a.duration || 0;
      setProgress(
        dur > 0 ? Math.max(0, Math.min(1, a.currentTime / dur)) : 0
      );
    };
    const onLoaded = () => {
      setDuration(Number.isFinite(a.duration) ? a.duration : 0);
      setProgress(
        a.duration
          ? Math.max(0, Math.min(1, a.currentTime / a.duration))
          : 0
      );
    };
    const onEnded = () => setIsPlaying(false);
    const onError = () => setIsPlaying(false);

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);

    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== respond to current track changes ===== */
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    if (current?.src) {
      a.src = current.src;
      a.load();
      if (isPlaying) {
        a.play().catch(() => setIsPlaying(false));
      } else a.pause();
    }
    a.volume = volume;
    setProgress(0);
    setDuration(0);
  }, [current, isPlaying, volume]);

  /* ===== respond to isPlaying changes ===== */
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) {
      a.play().catch(() => setIsPlaying(false));
    } else {
      a.pause();
    }
  }, [isPlaying]);

  /* ===== volume changes ===== */
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    setIsMuted(volume === 0);
  }, [volume]);

  /* ===== keyboard shortcuts ===== */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setShowNowPlaying(false);
      else if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === "ArrowLeft") prevTrack();
      else if (e.key === "ArrowRight") nextTrack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== socket + realtime updates ===== */
  useEffect(() => {
    socketRef.current = io(SERVER);
    socketRef.current.on("connect", () => {
      // console.log("socket connected", socketRef.current.id);
    });
    socketRef.current.on("new-track", (track) => {
      const normalized = {
        id: track.id,
        title: track.title,
        artist: track.artist || track.artist_name || "Unknown Artist",
        uploader: track.uploader_name || track.uploader || "Unknown uploader",
        src: track.src || track.public_url || "",
        cover: track.cover || track.cover_url || FALLBACK_COVER,
        created_at: track.created_at,
      };
      setLibrary((prev) => {
        if (prev.some((p) => p.id === normalized.id)) return prev;
        return [normalized, ...prev];
      });
    });

    socketRef.current.on("playlist-updated", () => {
      (async function () {
        try {
          const res = await fetch(`${SERVER}/api/playlists`);
          if (!res.ok) return;
          const json = await res.json();
          const items = json.playlists || json;
          setPlaylists(
            items.map((p) => ({
              id: p.id,
              name: p.name,
              trackIds: (p.tracks || [])
                .map((t) => t.track_id || t.id)
                .filter(Boolean),
            }))
          );
        } catch (e) {
          // ignore
        }
      })();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off("new-track");
        socketRef.current.off("playlist-updated");
        socketRef.current.disconnect();
      }
    };
  }, []);

  /* ===== helpers ===== */
  function formatTime(sec = 0) {
    if (!Number.isFinite(sec) || sec <= 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function seekToFraction(fraction) {
    const a = audioRef.current;
    if (!a || !a.duration || !Number.isFinite(a.duration)) return;
    const time = Math.max(0, Math.min(1, fraction)) * a.duration;
    a.currentTime = time;
    setProgress(fraction);
  }

  function toggleMute() {
    setVolume((prev) => {
      if (prev === 0) {
        const restored = volumeBeforeMuteRef.current || 0.9;
        return restored;
      } else {
        volumeBeforeMuteRef.current = prev;
        return 0;
      }
    });
  }

  /* ===== playback controls ===== */
  function onCardPlayButton(track) {
    if (current?.id === track.id) {
      setIsPlaying((p) => !p);
    } else {
      setCurrent(track);
      setIsPlaying(true);
    }
  }

  function prevTrack() {
    if (!current || library.length === 0) return;
    const idx = library.findIndex((t) => t.id === current.id);
    const prev = library[(idx - 1 + library.length) % library.length];
    if (prev) {
      setCurrent(prev);
      setIsPlaying(true);
    }
  }

  function nextTrack() {
    if (!current || library.length === 0) return;
    const idx = library.findIndex((t) => t.id === current.id);
    const next = library[(idx + 1) % library.length];
    if (next) {
      setCurrent(next);
      setIsPlaying(true);
    }
  }

  /* ===== likes & playlist management ===== */
  function toggleLike(id) {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createPlaylist(name) {
    if (!name?.trim()) return;
    const trimmed = name.trim();

    let token = "";
    try {
      const { data } = await supabase.auth.getSession();
      token = data?.session?.access_token || "";
    } catch (e) {
      token = "";
    }

    try {
      const res = await fetch(`${SERVER}/api/playlists`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => null);
        console.error("Create playlist failed:", res.status, text);
        alert("Could not create playlist. See console for details.");
        return;
      }

      const newPl = await res.json();
      setPlaylists((prev) => [
        ...prev,
        { id: newPl.id, name: newPl.name, trackIds: [] },
      ]);
      setNewPlaylistName("");
    } catch (err) {
      console.error("Network error while creating playlist:", err);
      alert("Network error while creating playlist");
    }
  }

  function openAddToPlaylist(track) {
    setPlaylistModal({ open: true, addingTrack: track });
  }

  async function addToPlaylist(playlistId, trackId) {
    setPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === playlistId
          ? { ...pl, trackIds: Array.from(new Set([...pl.trackIds, trackId])) }
          : pl
      )
    );
    setPlaylistModal({ open: false, addingTrack: null });

    try {
      let token = "";
      try {
        const { data } = await supabase.auth.getSession();
        token = data?.session?.access_token || "";
      } catch (e) {
        token = "";
      }

      const res = await fetch(
        `${SERVER}/api/playlists/${playlistId}/add-track`,
        {
          method: "POST",
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ trackId }),
        }
      );

      if (!res.ok) {
        const body = await res.text().catch(() => null);
        console.warn("Add to playlist failed:", res.status, body);
        setPlaylists((prev) =>
          prev.map((pl) =>
            pl.id === playlistId
              ? {
                  ...pl,
                  trackIds: pl.trackIds.filter((id) => id !== trackId),
                }
              : pl
          )
        );
        alert(body || "Could not add to playlist");
        return;
      }
    } catch (err) {
      console.error("Add to playlist error:", err);
      setPlaylists((prev) =>
        prev.map((pl) =>
          pl.id === playlistId
            ? { ...pl, trackIds: pl.trackIds.filter((id) => id !== trackId) }
            : pl
        )
      );
      alert("Failed to add to playlist (network error)");
    }
  }

  async function removeFromPlaylist(playlistId, trackId) {
    setPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === playlistId
          ? { ...pl, trackIds: pl.trackIds.filter((id) => id !== trackId) }
          : pl
      )
    );

    try {
      let token = "";
      try {
        const { data } = await supabase.auth.getSession();
        token = data?.session?.access_token || "";
      } catch (e) {
        token = "";
      }
      await fetch(`${SERVER}/api/playlists/${playlistId}/remove-track`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ trackId }),
      });
    } catch (e) {
      console.warn("Failed to notify server about playlist remove:", e);
    }
  }

  /* ===== navigation helpers ===== */
  function goAccount() {
    navigate("/account");
  }
  function goHome() {
    setRoute({ name: "home", data: null });
  }
  function goPlaylist(playlistId) {
    const pl = playlists.find((p) => p.id === playlistId);
    setRoute({
      name: "playlist",
      data: pl || { id: playlistId, name: "Playlist", trackIds: [] },
    });
  }
  function goFavorites() {
    setRoute({ name: "favorites", data: null });
  }

  /* visible search: title / artist / uploader */
  const visible = library.filter((t) => {
    const q = query.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.artist || "").toLowerCase().includes(q) ||
      (t.uploader || "").toLowerCase().includes(q)
    );
  });

  /* ===== small inline pages ===== */
  function PlaylistPage({ playlist }) {
    if (!playlist) return null;
    const songs = playlist.trackIds
      .map((id) => library.find((t) => t.id === id))
      .filter(Boolean);
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold">{playlist.name}</h2>
            <div className="text-sm text-slate-400">{songs.length} songs</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goHome()}
              className="px-3 py-1 rounded-md bg-white/6"
            >
              Back
            </button>
            <button
              onClick={() => {
                const name = prompt("Rename playlist", playlist.name);
                if (name) {
                  setPlaylists((prev) =>
                    prev.map((pl) =>
                      pl.id === playlist.id ? { ...pl, name } : pl
                    )
                  );
                  setRoute({
                    name: "playlist",
                    data: { ...playlist, name },
                  });
                }
              }}
              className="px-3 py-1 rounded-md bg-white/6"
            >
              Rename
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {songs.length === 0 && (
            <div className="text-slate-400">No songs in this playlist yet.</div>
          )}
          {songs.map((track) => (
            <div
              key={track.id}
              className="flex items-center gap-4 p-3 rounded-xl bg-white/4"
            >
              <img
                src={track.cover}
                alt={`${track.title} cover`}
                className="w-12 h-12 rounded-md object-cover"
                onError={(e) => (e.target.src = FALLBACK_COVER)}
              />
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{track.title}</div>
                    <div className="text-sm text-slate-300">
                      {track.artist}
                    </div>
                    <div className="text-xs text-slate-400">
                      Uploaded by {track.uploader}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onCardPlayButton(track)}
                      className="px-3 py-1 rounded-md bg-indigo-500 text-white"
                      aria-label={`Play ${track.title}`}
                    >
                      {current?.id === track.id && isPlaying ? (
                        <Pause size={14} />
                      ) : (
                        <Play size={14} />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        removeFromPlaylist(playlist.id, track.id)
                      }
                      className="p-2 rounded-full bg-white/4"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function FavoritesPage() {
    const favSongs = Array.from(liked)
      .map((id) => library.find((t) => t.id === id))
      .filter(Boolean);
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold">Favourites</h2>
            <div className="text-sm text-slate-400">
              {favSongs.length} songs
            </div>
          </div>
          <div>
            <button
              onClick={() => goHome()}
              className="px-3 py-1 rounded-md bg-white/6"
            >
              Back
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {favSongs.length === 0 && (
            <div className="text-slate-400">
              You have no favourite songs yet.
            </div>
          )}
          {favSongs.map((track) => (
            <div
              key={track.id}
              className="flex items-center gap-4 p-3 rounded-xl bg-white/4"
            >
              <img
                src={track.cover}
                alt={`${track.title} cover`}
                className="w-12 h-12 rounded-md object-cover"
                onError={(e) => (e.target.src = FALLBACK_COVER)}
              />
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{track.title}</div>
                    <div className="text-sm text-slate-300">
                      {track.artist}
                    </div>
                    <div className="text-xs text-slate-400">
                      Uploaded by {track.uploader}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onCardPlayButton(track)}
                      className="px-3 py-1 rounded-md bg-indigo-500 text-white"
                      aria-label={`Play ${track.title}`}
                    >
                      {current?.id === track.id && isPlaying ? (
                        <Pause size={14} />
                      ) : (
                        <Play size={14} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ===== rendered UI ===== */
  return (
    <div className="min-h-screen pb-28 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      <div className="max-w-6xl mx-auto px-5 py-8">
        {/* HEADER */}
        <header className="flex items-center justify-between">
          {/* left: brand */}
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 p-1">
              <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center font-bold">
                M
              </div>
            </div>
            <div>
              <h1 className="text-lg font-semibold">MoodStream</h1>
              <p className="text-sm text-slate-400">
                Aesthetic music streaming
              </p>
            </div>
          </div>

          {/* center: LARGE search */}
          <div className="flex-1 px-6">
            <div className="mx-auto max-w-4xl">
              <div className="flex items-center bg-white/5 rounded-full px-5 py-3 gap-4">
                <Search size={20} />
                <input
                  aria-label="Search songs or artists"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search songs, artists..."
                  className="bg-transparent outline-none text-base w-full"
                />
              </div>
            </div>
          </div>

          {/* right: My Account */}
          <div className="flex items-center gap-3">
            <button
              onClick={goAccount}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/6 hover:bg-white/8"
              aria-label="My Account"
            >
              <User size={18} />
              <span className="hidden sm:inline">My Account</span>
            </button>
          </div>
        </header>

        {/* GRID */}
        <div className="mt-6 grid grid-cols-12 gap-6">
          {/* SIDEBAR */}
          <aside className="col-span-3 bg-white/5 rounded-2xl p-4 backdrop-blur-md hidden md:block">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => goHome()}
                  className="font-medium"
                >
                  Home
                </button>
              </div>

              <div className="pt-3 border-t border-white/6">
                <small className="text-slate-400">Playlists</small>
                <ul className="mt-2 space-y-2">
                  {playlists.map((pl) => (
                    <li
                      key={pl.id}
                      onClick={() => goPlaylist(pl.id)}
                      className="bg-white/4 p-2 rounded-lg flex items-center justify-between cursor-pointer hover:bg-white/6"
                      role="button"
                      tabIndex={0}
                    >
                      <div className="text-sm">{pl.name}</div>
                      <div className="text-xs text-slate-300">
                        {pl.trackIds.length}
                      </div>
                    </li>
                  ))}
                  <li
                    className="bg-white/3 p-2 rounded-lg flex items-center gap-2 cursor-pointer"
                    onClick={() => {
                      const name = prompt("New playlist name?");
                      if (name) createPlaylist(name);
                    }}
                  >
                    <Plus size={14} />{" "}
                    <span className="text-sm">Create Playlist</span>
                  </li>
                </ul>
              </div>
            </div>
          </aside>

          {/* MAIN */}
          <main className="col-span-12 md:col-span-9 bg-white/3 rounded-3xl p-6 backdrop-blur-sm min-h-[60vh]">
            {route.name === "home" && (
              <>
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-semibold">Recommended</h2>
                    <div className="text-sm text-slate-400">
                      Tip: hover cards to interact
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visible.map((track) => (
                      <div
                        key={track.id}
                        className="bg-gradient-to-br from-white/5 to-white/3 rounded-2xl p-3 flex flex-col items-start gap-3 transform transition hover:-translate-y-1 hover:scale-[1.01]"
                      >
                        <img
                          src={track.cover}
                          alt={`${track.title} cover`}
                          className="w-full h-36 object-cover rounded-xl shadow-inner"
                          onError={(e) => (e.target.src = FALLBACK_COVER)}
                        />
                        <div className="w-full flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{track.title}</h4>
                            <p className="text-sm text-slate-300">
                              {track.artist}
                            </p>
                            <p className="text-xs text-slate-400">
                              Uploaded by {track.uploader}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onCardPlayButton(track)}
                              aria-label={`Play ${track.title}`}
                              className="p-2 rounded-full bg-indigo-500 text-white shadow-lg transform transition hover:scale-105"
                            >
                              {current?.id === track.id && isPlaying ? (
                                <Pause size={16} />
                              ) : (
                                <Play size={16} />
                              )}
                            </button>

                            <button
                              onClick={() => openAddToPlaylist(track)}
                              className="p-2 rounded-full bg-white/4"
                              title="Add to playlist"
                              aria-label={`Add ${track.title} to playlist`}
                            >
                              <List size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="mt-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-medium mb-3">
                      Your Library
                    </h3>
                    <div className="text-sm text-slate-400">
                      Tip: hover cards to interact
                    </div>
                  </div>
                  <div className="space-y-3">
                    {library.map((track) => (
                      <div
                        key={track.id}
                        className="flex items-center gap-4 p-3 rounded-xl bg-white/4"
                      >
                        <img
                          src={track.cover}
                          alt={`${track.title} cover`}
                          className="w-12 h-12 rounded-md object-cover"
                          onError={(e) => (e.target.src = FALLBACK_COVER)}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">
                                {track.title}
                              </div>
                              <div className="text-sm text-slate-300">
                                {track.artist}
                              </div>
                              <div className="text-xs text-slate-400">
                                Uploaded by {track.uploader}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onCardPlayButton(track)}
                                aria-label={`Play ${track.title}`}
                                className="px-3 py-1 rounded-md bg-indigo-500 text-white"
                              >
                                {current?.id === track.id && isPlaying ? (
                                  <Pause size={14} />
                                ) : (
                                  <Play size={14} />
                                )}
                              </button>

                              <button
                                onClick={() => openAddToPlaylist(track)}
                                aria-label={`Add ${track.title} to playlist`}
                                className="p-2 rounded-full bg-white/4"
                              >
                                <List size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {route.name === "playlist" && route.data && (
              <PlaylistPage playlist={route.data} />
            )}

            {route.name === "favorites" && <FavoritesPage />}
          </main>
        </div>

        {/* PLAYER (floating) */}
        <footer className="fixed left-0 right-0 bottom-6 mx-auto max-w-6xl px-5">
          <div className="bg-white/5 rounded-3xl p-4 backdrop-blur-md flex items-center gap-4">
            <img
              src={current?.cover}
              alt={`${current?.title} cover`}
              className="w-16 h-16 rounded-lg object-cover cursor-pointer"
              onClick={() => setShowNowPlaying(true)}
              onError={(e) => (e.target.src = FALLBACK_COVER)}
            />

            <div
              className="flex-1 cursor-pointer"
              onClick={() => setShowNowPlaying(true)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">
                    {current?.title || "—"}
                  </div>
                  <div className="text-sm text-slate-300">
                    {current?.artist || ""}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={prevTrack}
                    aria-label="Previous track"
                    className="p-2 rounded-full bg-white/6"
                  >
                    <SkipBack size={16} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPlaying((p) => !p);
                    }}
                    aria-label={isPlaying ? "Pause" : "Play"}
                    className="p-3 rounded-full bg-indigo-500 text-white"
                  >
                    {isPlaying ? (
                      <Pause size={18} />
                    ) : (
                      <Play size={18} />
                    )}
                  </button>

                  <button
                    onClick={nextTrack}
                    aria-label="Next track"
                    className="p-2 rounded-full bg-white/6"
                  >
                    <SkipForward size={16} />
                  </button>
                </div>
              </div>

              {/* progress range control */}
              <div className="mt-3">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm text-slate-300">
                    {formatTime((progress || 0) * (duration || 0))}
                  </span>

                  <div className="flex-1">
                    <input
                      aria-label="Seek"
                      type="range"
                      min={0}
                      max={1}
                      step={0.001}
                      value={isFinite(progress) ? progress : 0}
                      onChange={(e) =>
                        seekToFraction(parseFloat(e.target.value))
                      }
                      className="w-full h-2 appearance-none bg-transparent"
                      style={{
                        background: `linear-gradient(90deg, rgba(99,102,241,0.9) ${Math.round(
                          (isFinite(progress) ? progress : 0) * 100
                        )}%, rgba(255,255,255,0.12) ${Math.round(
                          (isFinite(progress) ? progress : 0) * 100
                        )}%)`,
                      }}
                    />
                  </div>

                  <span className="text-sm text-slate-300">
                    {formatTime(duration)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* NOW PLAYING OVERLAY */}
      {showNowPlaying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
          <div className="relative w-full max-w-4xl bg-transparent">
            <button
              onClick={() => setShowNowPlaying(false)}
              aria-label="Close now playing"
              className="absolute right-0 top-0 m-4 p-2 rounded-full bg-white/6"
            >
              <X size={20} />
            </button>

            <div className="rounded-2xl overflow-hidden bg-gradient-to-b from-slate-900/80 to-slate-800/80 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="flex items-center justify-center">
                  <img
                    src={current?.cover}
                    alt={`${current?.title} cover`}
                    className="w-full max-w-md rounded-xl shadow-2xl object-cover"
                    onError={(e) => (e.target.src = FALLBACK_COVER)}
                  />
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="text-3xl font-bold">
                      {current?.title || "—"}
                    </div>
                    <div className="text-lg text-slate-300">
                      {current?.artist || ""}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm text-slate-300">
                        {formatTime((progress || 0) * (duration || 0))}
                      </span>
                      <div className="flex-1">
                        <input
                          aria-label="Seek (now playing)"
                          type="range"
                          min={0}
                          max={1}
                          step={0.001}
                          value={isFinite(progress) ? progress : 0}
                          onChange={(e) =>
                            seekToFraction(parseFloat(e.target.value))
                          }
                          className="w-full h-3 appearance-none bg-transparent"
                          style={{
                            background: `linear-gradient(90deg, rgba(99,102,241,0.9) ${Math.round(
                              (isFinite(progress) ? progress : 0) * 100
                            )}%, rgba(255,255,255,0.12) ${Math.round(
                              (isFinite(progress) ? progress : 0) * 100
                            )}%)`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-slate-300">
                        {formatTime(duration)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={prevTrack}
                      aria-label="Previous track"
                      className="p-3 rounded-full bg-white/6"
                    >
                      <SkipBack size={20} />
                    </button>
                    <button
                      onClick={() => setIsPlaying((p) => !p)}
                      aria-label={isPlaying ? "Pause" : "Play"}
                      className="p-4 rounded-full bg-indigo-500 text-white"
                    >
                      {isPlaying ? <Pause size={22} /> : <Play size={22} />}
                    </button>
                    <button
                      onClick={nextTrack}
                      aria-label="Next track"
                      className="p-3 rounded-full bg-white/6"
                    >
                      <SkipForward size={20} />
                    </button>

                    <div className="flex items-center gap-2 ml-4">
                      {/* Speaker icon: toggle mute */}
                      <button
                        type="button"
                        onClick={toggleMute}
                        aria-label={isMuted ? "Unmute" : "Mute"}
                        className="p-1 rounded-full bg-transparent"
                      >
                        <Volume2 className={isMuted ? "opacity-60" : ""} />
                      </button>
                      <input
                        aria-label="Volume"
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={volume}
                        onChange={(e) =>
                          setVolume(parseFloat(e.target.value))
                        }
                        className="w-40"
                      />
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => toggleLike(current?.id)}
                        aria-label="Like current"
                        className={`p-2 rounded-md ${
                          liked.has(current?.id)
                            ? "bg-pink-500 text-white"
                            : "bg-white/6"
                        }`}
                        title="Like"
                      >
                        <Heart size={16} />
                      </button>

                      <button
                        onClick={() => openAddToPlaylist(current)}
                        aria-label="Add current to playlist"
                        className="p-2 rounded-md bg-white/6 flex items-center gap-2"
                      >
                        <List size={16} />{" "}
                        <span className="hidden sm:inline">
                          Add to playlist
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400">
                    Tip: drag the progress to skip. Press Esc to close. Press
                    Space to play/pause, ← / → to skip.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLAYLIST MODAL */}
      {playlistModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-lg bg-slate-900 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">
                Add "{playlistModal.addingTrack?.title}" to playlist
              </h4>
              <button
                onClick={() =>
                  setPlaylistModal({ open: false, addingTrack: null })
                }
                className="p-2 rounded-full bg-white/6"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  className="flex items-center justify-between bg-white/5 p-3 rounded-md"
                >
                  <div>
                    <div className="font-medium">{pl.name}</div>
                    <div className="text-xs text-slate-400">
                      {pl.trackIds.length} songs
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pl.trackIds.includes(playlistModal.addingTrack?.id) ? (
                      <button
                        onClick={() =>
                          removeFromPlaylist(pl.id, playlistModal.addingTrack.id)
                        }
                        className="px-3 py-1 rounded-md bg-white/6 text-sm"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          addToPlaylist(pl.id, playlistModal.addingTrack.id)
                        }
                        className="px-3 py-1 rounded-md bg-indigo-500 text-white text-sm"
                      >
                        Add
                      </button>
                    )}
                    <button
                      onClick={() => goPlaylist(pl.id)}
                      className="px-2 py-1 rounded-md bg-white/6 text-sm"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))}

              <div className="pt-3 border-t border-white/6">
                <div className="text-sm text-slate-300 mb-2">
                  Create new playlist
                </div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-white/6 rounded-md px-3 py-2 outline-none"
                    placeholder="Playlist name"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                  />
                  <button
                    onClick={() => {
                      createPlaylist(newPlaylistName);
                    }}
                    className="px-3 py-2 rounded-md bg-indigo-500 text-white"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 text-right">
              <button
                onClick={() =>
                  setPlaylistModal({ open: false, addingTrack: null })
                }
                className="px-3 py-2 rounded-md bg-white/6"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
