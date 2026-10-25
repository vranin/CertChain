import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Landing from "./pages/Landing";
import Issue from "./pages/Issue";
import Verify from "./pages/Verify";
import Admin from "./pages/Admin";
import Activity from "./pages/Activity";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/issue" element={<Issue />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/activity" element={<Activity />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
