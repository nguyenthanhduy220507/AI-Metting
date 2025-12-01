import React from "react";
import {
  LayoutDashboard,
  Video,
  Users,
} from "lucide-react";
import imgLogo from "../../assets/images/common/logo.png";
import { useNavigate, useLocation } from "react-router-dom";
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const SideBar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Video, label: "Meetings", path: "/meetings" },
    { icon: Users, label: "Speakers", path: "/speakers" },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        <div className="flex flex-col h-full">
          {/* Logo area - hidden on desktop since it's in header */}
          <div className=" p-6 ">
            <img className="" src={imgLogo}></img>
          </div>
          {/* User info */}
          <div className="p-4 ">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">TV</span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  Thuong Trinh Van
                </div>
                <div className="text-xs text-gray-500">Administrator</div>
              </div>
            </div>
          </div>
          {/* Navigation */}
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;

            return (
              <div key={index}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`
          w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all duration-200
          ${
            isActive
              ? "bg-secondary text-emerald-700 border-r-4 border-secondary"
              : "text-gray-700 hover:bg-gray-50"
          }
        `}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon
                      className={`w-5 h-5 ${
                        isActive ? "text-white" : "text-gray-500"
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        isActive ? "text-white" : "text-gray-500"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                  
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default SideBar;
