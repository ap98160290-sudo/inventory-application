import { useLocation, useNavigate } from "react-router-dom";

const sections = [
  {
    label: "Main",
    items: [
      { name: "Dashboard", path: "/dashboard", icon: "[]", disabled: false },
      { name: "Inventory", path: "/inventory", icon: "[]", disabled: false },
    ],
  },
  {
    label: "Operations",
    items: [
      { name: "Scan & Manage", path: "/scan",  icon: ">", disabled: false },
      { name: "Voice Command", path: "/voice", icon: "*", disabled: false },
    ],
  },
  {
    label: "Analytics",
    items: [
      { name: "Charts & Insights", path: "/charts",       icon: "=", disabled: false },
      { name: "Transactions",      path: "/transactions", icon: "+", disabled: false },
    ],
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = localStorage.getItem("user_email") || "user@gmail.com";

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    navigate("/");
  };

  return (
    <div className="sidebar">
      <div>
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <span className="logo-main">Stock</span>
            <span className="logo-accent">Flow</span>
          </div>
          <div className="sidebar-subtitle">Inventory OS</div>
        </div>

        <div className="sidebar-sections">
          {sections.map((section) => (
            <div className="nav-group" key={section.label}>
              <div className="nav-group-title">{section.label}</div>

              {section.items.map((item) => {
                const isActive = item.path && location.pathname === item.path;
                const classes = [
                  "nav-item",
                  isActive    ? "active"   : "",
                  item.disabled ? "disabled" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <button
                    key={item.name}
                    className={classes}
                    type="button"
                    onClick={() => {
                      if (item.path) navigate(item.path);
                    }}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-user">
        <div className="user-info">
          <div className="avatar">{email[0]?.toUpperCase()}</div>
          <div className="email">{email}</div>
        </div>

        <button className="logout-btn" onClick={handleLogout} type="button">
          Logout
        </button>
      </div>
    </div>
  );
}