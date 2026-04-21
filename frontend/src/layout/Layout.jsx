import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({ children }) {
  return (
    <>
      <Sidebar />

      <div className="main">
        <Topbar />
        <div className="content">{children}</div>
      </div>
    </>
  );
}