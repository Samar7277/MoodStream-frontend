// src/LoginPage.jsx
import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "./supabaseClient";

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // "login" | "signup" | "forgot"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function submitEmail(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      // FORGOT PASSWORD MODE
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
          redirectTo: `${window.location.origin}/update-password`,
        });

        if (error) throw error;

        setInfo(
          "Password reset link sent! Check your email and follow the link to set a new password."
        );
        setLoading(false);
        return;
      }

      // SIGNUP
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            // You can change this redirect if you want
            emailRedirectTo: `${window.location.origin}/login`,
            data: { name: form.name },
          },
        });

        if (error) throw error;

        setInfo("Verify your email to log in to your account.");
        setLoading(false);
        return;
      }

      // LOGIN
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (signInError) throw signInError;

      // If you don't want email verification, you can remove everything below
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      const emailConfirmed = !!user?.email_confirmed_at;

      if (!emailConfirmed) {
        await supabase.auth.signOut();
        setError(
          "Your email is not verified. Check your inbox for the confirmation link."
        );
        setLoading(false);
        return;
      }

      window.location.href = "/";
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  const isForgot = mode === "forgot";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 text-slate-100 p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 rounded-3xl p-6 shadow-lg backdrop-blur">
        {/* Left */}
        <div className="hidden md:flex flex-col items-center justify-center gap-4 p-4">
          <img
            src="logo.jpg"
            alt="poster"
            className="w-full rounded-xl object-cover h-64"
          />
          <h2 className="text-2xl font-bold">Welcome to MoodStream</h2>
          <p className="text-sm text-slate-300 text-center">
            Sign up to enjoy music and access your playlists and uploads.
          </p>
        </div>

        {/* Right */}
        <div className="p-4">
          <h1 className="text-2xl font-semibold mb-2">
            {mode === "login"
              ? "Sign in"
              : mode === "signup"
              ? "Create account"
              : "Reset password"}
          </h1>
          <p className="text-sm text-slate-400 mb-4">
            {mode === "forgot"
              ? "Enter your email and we'll send you a password reset link."
              : "Use your email and password."}
          </p>

          <div className="space-y-3">
            <form onSubmit={submitEmail} className="space-y-3">
              {mode === "signup" && (
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Full name"
                  className="w-full px-3 py-2 rounded bg-white text-black placeholder-gray-600 outline-none"
                />
              )}

              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="Email"
                className="w-full px-3 py-2 rounded bg-white text-black placeholder-gray-600 outline-none"
              />

              {/* Password field only for login & signup */}
              {!isForgot && (
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    required={mode !== "forgot"} // required for login & signup
                    placeholder="Password"
                    className="w-full px-3 py-2 rounded bg-white text-black outline-none placeholder-gray-600 pr-10"
                  />

                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black"
                    onMouseDown={() => setShowPassword(true)}
                    onMouseUp={() => setShowPassword(false)}
                    onMouseLeave={() => setShowPassword(false)}
                    onTouchStart={() => setShowPassword(true)}
                    onTouchEnd={() => setShowPassword(false)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              )}

              {/* Forgot password link (only in login mode) */}
              {mode === "login" && (
                <div className="text-right text-xs">
                  <button
                    type="button"
                    className="text-indigo-300 hover:underline"
                    onClick={() => {
                      setMode("forgot");
                      setError(null);
                      setInfo(null);
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {error && <p className="text-red-400 text-sm">{error}</p>}
              {info && <p className="text-slate-300 text-sm">{info}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 disabled:opacity-60"
              >
                {loading
                  ? "Please wait..."
                  : mode === "login"
                  ? "Sign in"
                  : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
              </button>
            </form>

            {/* Bottom toggle text */}
            <div className="text-sm text-slate-400 text-center">
              {mode === "login" && (
                <span>
                  Don’t have an account?{" "}
                  <button
                    className="text-indigo-300"
                    onClick={() => {
                      setMode("signup");
                      setError(null);
                      setInfo(null);
                    }}
                  >
                    Create one
                  </button>
                </span>
              )}

              {mode === "signup" && (
                <span>
                  Already have an account?{" "}
                  <button
                    className="text-indigo-300"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                      setInfo(null);
                    }}
                  >
                    Sign in
                  </button>
                </span>
              )}

              {mode === "forgot" && (
                <span>
                  Remembered your password?{" "}
                  <button
                    className="text-indigo-300"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                      setInfo(null);
                    }}
                  >
                    Back to sign in
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
