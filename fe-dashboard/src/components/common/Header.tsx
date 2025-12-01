import React from "react";
import { Search, ChevronRight } from "lucide-react";
import { useLocation } from "react-router-dom";

interface HeaderProps {
  onMenuClick: () => void;
  isMenuOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, isMenuOpen }) => {
  const location = useLocation();

  const getBreadcrumb = () => {
    const path = location.pathname;
    
    if (path === "/") {
      return [{ label: "Dashboard" }];
    }
    
    if (path === "/meetings") {
      return [{ label: "Meetings" }, { label: "All Meetings" }];
    }
    
    if (path.startsWith("/meetings/") && path !== "/meetings") {
      const meetingId = path.split("/meetings/")[1];
      return [
        { label: "Meetings" },
        { label: "Meeting Details", id: meetingId },
      ];
    }
    
    if (path === "/speakers") {
      return [{ label: "Speakers" }, { label: "All Speakers" }];
    }
    
    if (path === "/speakers/create") {
      return [{ label: "Speakers" }, { label: "Create Speaker" }];
    }
    
    return [{ label: "Dashboard" }];
  };

  const breadcrumb = getBreadcrumb();

  return (
    <header className="bg-primary shadow-sm border-b border-gray-200 px-6 py-4 min-h-[80px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2 text-sm text-white">
            {breadcrumb.map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && <ChevronRight className="w-4 h-4" />}
                <span
                  className={
                    index === breadcrumb.length - 1
                      ? "text-white font-medium"
                      : "text-white/80"
                  }
                >
                  {item.label}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search"
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none w-64"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
