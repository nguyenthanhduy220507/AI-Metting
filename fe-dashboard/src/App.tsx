import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import MainLayout from "./layouts/MainLayout";
import { Dashboard, AllMeetings, MeetingDetail, AllSpeakers, CreateSpeaker } from "./pages";

function App() {
  return (
    <Router>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="meetings" element={<AllMeetings />} />
          <Route path="meetings/:id" element={<MeetingDetail />} />
          <Route path="speakers" element={<AllSpeakers />} />
          <Route path="speakers/create" element={<CreateSpeaker />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
