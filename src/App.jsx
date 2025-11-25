// src/App.jsx
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import MainHomePage from "./MainHomePage";
import LoginPage from "./LoginPage";
import MyAccount from "./MyAccount";
import UploadPage from "./UploadPage";
import UpdatePassword from "./UpdatePassword";
import { supabase } from "./supabaseClient";

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check current user on load
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
      setChecking(false);
    });

    // Listen to login/logout
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  if (checking) return null; // or loader if you want

  return (
    <Routes>
      {/* Default route → Login if not logged in */}
      <Route
        path="/"
        element={user ? <MainHomePage /> : <Navigate to="/login" />}
      />

      {/* Login page (redirect to home if user already logged in) */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" /> : <LoginPage />}
      />

      {/* Protected Routes */}
      <Route
        path="/account"
        element={user ? <MyAccount /> : <Navigate to="/login" />}
      />

      <Route
        path="/upload"
        element={user ? <UploadPage /> : <Navigate to="/login" />}
      />

      <Route
        path="/update-password"
        element={user ? <UpdatePassword /> : <Navigate to="/login" />}
      />
    </Routes>
  );
}


