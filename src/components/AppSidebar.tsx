import { NavLink, useLocation } from "react-router-dom";
import { 
  FaHeart, 
  FaStethoscope, 
  FaClipboardList, 
  FaHeadset, 
  FaUserAlt, 
  FaFileMedical, 
  FaChartBar, 
  FaCog 
} from "react-icons/fa";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

const navigationItems = [
  { title: "Início", url: "/", icon: FaHeart },
  { title: "Consultas", url: "/consultas", icon: FaStethoscope },
  { title: "Agendamentos", url: "/agendamentos", icon: FaClipboardList },
  { title: "Suporte", url: "/suporte", icon: FaHeadset },
  { title: "Pacientes", url: "/patients", icon: FaUserAlt },
  { title: "Laudos", url: "/laudos", icon: FaFileMedical },
  { title: "Relatórios", url: "/relatorios", icon: FaChartBar },
  { title: "Configurações", url: "/configuracoes", icon: FaCog },
];

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(path);
  };

  return (
    <Sidebar className="w-16 border-r border-border">
      <SidebarContent>
        <SidebarGroup className="py-4">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {navigationItems.map((item) => {
                const IconComponent = item.icon;
                const active = isActive(item.url);
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      className={`
                        w-12 h-12 p-0 flex items-center justify-center
                        ${active 
                          ? 'bg-primary text-primary-foreground rounded-lg' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }
                      `}
                    >
                      <NavLink 
                        to={item.url} 
                        title={item.title}
                        className="flex items-center justify-center w-full h-full"
                      >
                        <IconComponent size={20} />
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}