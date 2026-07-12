import React, { useState, useEffect, Suspense } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Banknote,
  Building2,
  FileText,
  HardHat,
  History,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  Menu,
  Settings,
  Tag,
  Users,
  Webhook,
  Wrench,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppSelector, useAppDispatch } from '../../shared/hooks/useAppSelector';
import { logout } from '../../entities/auth/model/authSlice';
import { NotificationBell } from '../NotificationBell/NotificationBell';
import { GlobalSearchBar } from '../GlobalSearchBar/GlobalSearchBar';
import { LanguageSwitcher } from '../../shared/ui/LanguageSwitcher';
import { ThemeToggle } from '../../shared/ui/ThemeToggle';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { APP_BASE, appPath } from '../../shared/config/routes';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { can } = usePermissions();

  const navItems = [
    { labelKey: 'nav.dashboard', icon: LayoutDashboard, path: appPath() },
    { labelKey: 'nav.apartments', icon: Building2, path: appPath('/apartments') },
    { labelKey: 'nav.tenants', icon: Users, path: appPath('/tenants') },
    { labelKey: 'nav.leases', icon: FileText, path: appPath('/leases') },
    { labelKey: 'nav.rent', icon: Banknote, path: appPath('/rent') },
    { labelKey: 'nav.utilities', icon: Zap, path: appPath('/utilities') },
    { labelKey: 'nav.repairs', icon: Wrench, path: appPath('/repairs') },
    { labelKey: 'nav.contractors', icon: HardHat, path: appPath('/contractors') },
    ...(can('audit:read') ? [{ labelKey: 'nav.audit', icon: History, path: appPath('/audit') }] : []),
    ...(can('accounting:read') ? [{ labelKey: 'nav.accounting', icon: Lock, path: appPath('/accounting') }] : []),
    ...(can('tags:read') ? [{ labelKey: 'nav.tags', icon: Tag, path: appPath('/tags') }] : []),
    ...(can('webhooks:read') ? [{ labelKey: 'nav.webhooks', icon: Webhook, path: appPath('/webhooks') }] : []),
    ...(can('org:read') ? [{ labelKey: 'nav.settings', icon: Settings, path: appPath('/settings') }] : []),
  ];

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const isActive = (path: string) =>
    location.pathname === path || (path !== APP_BASE && location.pathname.startsWith(path));

  const sidebarNav = (
    <nav className="flex flex-col gap-0.5 p-2">
      {navItems.map((item) => (
        <button
          key={item.path}
          type="button"
          onClick={() => navigate(item.path)}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            isActive(item.path)
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {t(item.labelKey)}
        </button>
      ))}
    </nav>
  );

  const brand = (
    <div className="flex h-14 items-center gap-2 border-b px-4">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
        <Building2 className="h-4 w-4 text-primary-foreground" />
      </div>
      <span className="font-bold tracking-tight">RentManager</span>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-card md:flex">
        {brand}
        <div className="flex-1 overflow-y-auto">{sidebarNav}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur sm:px-4">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {brand}
              {sidebarNav}
            </SheetContent>
          </Sheet>

          <GlobalSearchBar />
          <div className="flex-1" />
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          <ThemeToggle />
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-sm text-primary-foreground">
                    {user?.firstName?.[0] ?? 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <span className="block truncate text-sm">{user?.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 sm:hidden">
                <LanguageSwitcher />
              </div>
              <DropdownMenuSeparator className="sm:hidden" />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                {t('nav.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6">
          <Suspense
            fallback={
              <div className="flex justify-center pt-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
