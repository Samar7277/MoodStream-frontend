// src/UploadPage.jsx
import React from "react";
import UploadForm from "./components/UploadForm";

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Upload Your Music</h1>

      <div className="max-w-2xl mx-auto">
        <UploadForm onUploaded={(track) => {
          console.log("Track uploaded:", track);
        }} />
      </div>
    </div>
  );
}
