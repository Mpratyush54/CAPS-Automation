import { Link } from "react-router-dom";
import { Home, ListTodo, Calendar, BarChart2, Building2, Bell, User } from "lucide-react";

const NavBar = () => {
  const items = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/logs", icon: ListTodo, label: "Logs" },
    { to: "/events", icon: Calendar, label: "Events" },
    { to: "/reports", icon: BarChart2, label: "Reports" },
    { to: "/organization", icon: Building2, label: "Organization" },
    { to: "/notifications", icon: Bell, label: "Notifications" },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark flex justify-around py-2 md:relative md:border-0 md:flex-col md:h-screen md:w-20 md:justify-start md:pt-4">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="flex flex-col items-center text-on-surface dark:text-on-surface-dark hover:text-primary transition-colors"
        >
          <item.icon size={24} />
          <span className="text-xs md:hidden">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
};

export default NavBar;
