import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function UploadForm({ onUploaded }) {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  function onAudioChange(e) {
    setAudioFile(e.target.files?.[0] ?? null);
  }

  function onCoverChange(e) {
    setCoverFile(e.target.files?.[0] ?? null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(null);

    if (!title || !artist || !audioFile) {
      setMsg("Please provide a title, artist name, and audio file.");
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("title", title);
      form.append("artist_name", artist);
      form.append("audio", audioFile);
      if (coverFile) form.append("cover", coverFile);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch("http://localhost:4000/api/upload-track", {
        method: "POST",
        body: form,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      let bodyText = await res.text();
      let json = null;
      try {
        json = JSON.parse(bodyText);
      } catch (err) {
        console.error("Could not parse JSON:", err);
        console.log("Raw backend:", bodyText);
        setMsg("Backend did not return JSON. Check console.");
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error(json?.error || "Upload failed");

      setMsg("Upload successful!");
      setTitle("");
      setArtist("");
      setAudioFile(null);
      setCoverFile(null);

      if (onUploaded) onUploaded(json.track);
    } catch (err) {
      console.error("Upload error:", err);
      setMsg(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full pb-28 text-slate-100 flex items-start bg-black">
      <div className="max-w-6xl w-full mx-auto px-5 py-8">
        <div className="w-full max-w-2xl mx-auto">
          <div className="p-6 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold">Upload a song</h2>
                <p className="text-sm text-slate-300">
                  Your upload will appear in the main feed & your profile.
                </p>
              </div>

              {/* MoodStream Logo Redirect */}
              <div
                onClick={() => navigate("/")}
                className="rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 p-1 cursor-pointer hover:scale-110 transition"
                title="Go to Homepage"
              >
                <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center font-bold">
                  M
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                className="w-full px-4 py-3 rounded-lg bg-white text-black placeholder:text-slate-500 outline-none"
              />

              <input
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Artist Name"
                className="w-full px-4 py-3 rounded-lg bg-white text-black placeholder:text-slate-500 outline-none"
              />

              <div>
                <label className="block text-sm mb-2 text-slate-300">Audio file</label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-700/30 cursor-pointer text-sm border border-white/10">
                    <input type="file" accept="audio/*" onChange={onAudioChange} className="hidden" />
                    <span>{audioFile ? "Change audio" : "Select audio"}</span>
                  </label>

                  {audioFile && <div className="text-xs text-slate-300">{audioFile.name}</div>}
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 text-slate-300">Cover (optional)</label>
                <div className="flex items-start gap-4">
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-700/30 cursor-pointer text-sm border border-white/10">
                    <input type="file" accept="image/*" onChange={onCoverChange} className="hidden" />
                    <span>{coverFile ? "Change cover" : "Select cover"}</span>
                  </label>

                  {coverFile && (
                    <div className="w-28 h-28 rounded-lg overflow-hidden bg-indigo-700/30 border border-white/10">
                      <img
                        src={URL.createObjectURL(coverFile)}
                        alt="cover preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              {msg && <div className="text-sm text-indigo-200">{msg}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-4 py-3 rounded-full hover:opacity-95 disabled:opacity-50 shadow-md"
              >
                {loading ? "Uploading..." : "Upload"}
              </button>
            </form>
          </div>

          <div className="mt-6 text-sm text-slate-300">
            Tip: cover images look best at square 1:1 ratio.
            <br />
            <span className="text-indigo-400">Tap the M logo anytime to return Home</span>
          </div>
        </div>
      </div>
    </div>
  );
}
