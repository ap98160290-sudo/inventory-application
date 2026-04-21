import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AddProductModal from "../components/inventory/AddProductModal";

const titles = {
  "/dashboard":    "Dashboard",
  "/inventory":    "Inventory",
  "/scan":         "Scan & Manage",
  "/voice":        "Voice Command",
  "/charts":       "Charts & Insights",
  "/transactions": "Transactions",
};

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);
  const title = titles[location.pathname] || "Dashboard";

  return (
    <>
      <div className="topbar">
        <h1 className="topbar-title">{title}</h1>

        <div className="topbar-actions">
          <button
            className="topbar-btn topbar-btn-ghost"
            type="button"
            onClick={() => navigate("/scan")}
          >
            ⚡ Quick Scan
          </button>

          <button
            className="topbar-btn topbar-btn-primary"
            type="button"
            onClick={() => setAddOpen(true)}
          >
            + Add Product
          </button>
        </div>
      </div>

      {addOpen ? (
        <AddProductModal
          onClose={() => setAddOpen(false)}
          onSuccess={() => {
            setAddOpen(false);
            toast.success("Product added successfully");
            navigate("/inventory");
          }}
        />
      ) : null}
    </>
  );
}