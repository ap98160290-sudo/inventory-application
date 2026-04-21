import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import ProtectedRoute    from "./components/ProtectedRoute";
import Login             from "./pages/Login";
import Dashboard         from "./pages/Dashboard";
import Inventory         from "./pages/Inventory";
import ScanManage        from "./pages/ScanManage";
import VoiceCommand      from "./pages/VoiceCommand";
import ChartsInsights    from "./pages/ChartsInsights";
import Transactions      from "./pages/Transactions";

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#020617",
            color: "#e5e7eb",
            border: "1px solid #1f2937",
            fontSize: "13px",
          },
        }}
      />

      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/dashboard"    element={<ProtectedRoute><Dashboard      /></ProtectedRoute>} />
        <Route path="/inventory"    element={<ProtectedRoute><Inventory       /></ProtectedRoute>} />
        <Route path="/scan"         element={<ProtectedRoute><ScanManage      /></ProtectedRoute>} />
        <Route path="/voice"        element={<ProtectedRoute><VoiceCommand    /></ProtectedRoute>} />
        <Route path="/charts"       element={<ProtectedRoute><ChartsInsights  /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><Transactions    /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;