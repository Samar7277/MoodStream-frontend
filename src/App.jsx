// src/App.jsx
import { Routes, Route } from "react-router-dom";

import MainHomePage from "./MainHomePage";
import LoginPage from "./LoginPage";
import MyAccount from "./MyAccount";
import UploadPage from "./UploadPage";   // ✅ correct path (same folder)
import UpdatePassword from "./UpdatePassword";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainHomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/account" element={<MyAccount />} />
      <Route path="/update-password" element={<UpdatePassword />} />


      {/* Upload page route */}
      <Route path="/upload" element={<UploadPage />} />
    </Routes>
  );
}


