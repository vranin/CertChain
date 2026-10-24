import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import Issue from "./pages/Issue";
import Verify from "./pages/Verify";
import Admin from "./pages/Admin";
import Activity from "./pages/Activity";
// ... existing imports

<Routes>
        {/* Your other existing routes here (e.g. /, /issue, /verify) */}
        <Route path="/admin" element={<Admin />} />
        <Route path="/activity" element={<Activity />} />
      </Routes>
      export default App;