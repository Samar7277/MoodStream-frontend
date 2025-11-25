// src/UpdatePassword.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        setError(
          "This password reset link is invalid or has expired. Please request a new one from the login page."
        );
      }
    })();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!password || !confirm) {
      setError("Please enter and confirm your new password.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;

      setInfo("Your password has been updated. You can now sign in.");
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 text-slate-100 p-4">
      <div className="w-full max-w-md bg-white/5 rounded-3xl p-6 shadow-lg backdrop-blur">

        {/* MoodStream Title */}
        <h1 className="text-3xl font-bold text-center mb-4 text-indigo-300">MoodStream</h1>
        <h2 className="text-2xl font-semibold mb-2 text-center">Set a new password</h2>
        <p className="text-sm text-slate-400 mb-4 text-center">
          Enter your new password below.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          
          {/* New Password Field */}
          <div className="relative">
            <input
              type={showPass1 ? "text" : "password"}
              placeholder="New password"
              className="w-full px-3 py-2 rounded bg-white text-black placeholder-gray-600 outline-none pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-black"
              onMouseDown={() => setShowPass1(true)}
              onMouseUp={() => setShowPass1(false)}
              onMouseLeave={() => setShowPass1(false)}
              onTouchStart={() => setShowPass1(true)}
              onTouchEnd={() => setShowPass1(false)}
            >
              {showPass1 ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Confirm Password Field */}
          <div className="relative">
            <input
              type={showPass2 ? "text" : "password"}
              placeholder="Confirm new password"
              className="w-full px-3 py-2 rounded bg-white text-black placeholder-gray-600 outline-none pr-10"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />

            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-black"
              onMouseDown={() => setShowPass2(true)}
              onMouseUp={() => setShowPass2(false)}
              onMouseLeave={() => setShowPass2(false)}
              onTouchStart={() => setShowPass2(true)}
              onTouchEnd={() => setShowPass2(false)}
            >
              {showPass2 ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {info && <p className="text-emerald-300 text-sm">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 disabled:opacity-60"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>

        <button
          onClick={() => navigate("/login")}
          className="mt-4 w-full text-sm text-indigo-300 hover:underline text-center"
        >
          Back to login
        </button>
      </div>
    </div>
  );
}
