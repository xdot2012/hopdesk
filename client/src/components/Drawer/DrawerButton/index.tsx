import { ReactNode } from 'react';
import { NavLink } from "react-router-dom";
import { cn } from "~/lib/utils";

interface Props {
  children?: ReactNode;
  text: string;
  path: string;
  drawerOpen?: boolean;
  /** Exact path match — use when a sibling route shares the same prefix (e.g. /tickets vs /tickets/history). */
  end?: boolean;
}

const DrawerButton = ({ children, text, path, drawerOpen = true, end = false }: Props) => {
  return (
    <NavLink
      to={path}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          !drawerOpen && 'justify-center',
          isActive &&
            'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
        )
      }
      style={{ color: 'inherit', textDecoration: 'inherit' }}
      title={!drawerOpen ? text : undefined}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">{children}</span>
      {drawerOpen && <span className="truncate">{text}</span>}
    </NavLink>
  );
};

export default DrawerButton;
