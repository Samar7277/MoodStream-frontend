// src/MyAccount.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";

export default function MyAccount() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Safe initials fallback
  function initials(nameOrEmail) {
    if (!nameOrEmail) return "U";
    const token = (nameOrEmail.split(" ")[0] || nameOrEmail).trim();
    return token[0]?.toUpperCase() || "U";
  }

  // Load logged-in user
  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.warn(error);
      setUser(data?.user || null);
    }
    loadUser();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      <div className="max-w-4xl mx-auto bg-white/5 rounded-2xl p-6 shadow-lg backdrop-blur">
        {/* USER HEADER */}
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-3xl font-bold text-white">
            {initials(user?.user_metadata?.name || user?.email)}
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-semibold">
                  {user?.user_metadata?.name || user?.email || "User"}
                </div>
                <div className="text-sm text-slate-300">{user?.email}</div>
                <div className="text-xs text-slate-400 mt-1">
                  Member since:{" "}
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString()
                    : "-"}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Upload Song (go to upload page) */}
                <button
                  onClick={() => navigate("/upload")}
                  className="px-4 py-2 rounded-md bg-indigo-500 text-white hover:bg-indigo-600"
                >
                  Upload Song
                </button>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* You can add other account settings sections here later if you want */}
      </div>
    </div>
  );
}
