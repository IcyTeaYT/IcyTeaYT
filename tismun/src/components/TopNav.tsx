import { Gavel, Landmark, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { firstNameOf } from '@/data/source';
import { cn } from '@/lib/cn';
import { isChair, isSecretariat, useAuth } from '@/store/auth';
import { Logo } from './Logo';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

/** Delegates are known by their country; chairs by the committee they run. */
function subtitleFor(user: NonNullable<ReturnType<typeof useAuth.getState>['user']>): string {
  if (user.title) return user.title;
  if (user.role === 'SECRETARIAT') return 'Secretariat';
  if (user.country) return user.country;
  if (user.committeeId) return user.committeeId.toUpperCase();
  return 'Unassigned';
}

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'relative py-1 text-sm font-medium transition-colors duration-200',
    'after:absolute after:-bottom-[21px] after:left-0 after:h-[2px] after:w-full after:rounded-full',
    'after:transition-opacity after:duration-200 after:bg-teal-500',
    isActive ? 'text-ink-900 after:opacity-100' : 'text-muted after:opacity-0 hover:text-ink-800',
  );
}

export function TopNav() {
  const user = useAuth((state) => state.user);
  const signOut = useAuth((state) => state.signOut);
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const items: NavItem[] = [
    { to: '/', label: 'Home', end: true },
    { to: '/committees', label: 'Committees' },
  ];
  if (isChair(user)) items.push({ to: '/chair', label: 'Chair Dashboard' });
  if (isSecretariat(user)) items.push({ to: '/secretariat', label: 'Secretariat' });

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/85 backdrop-blur-[6px]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5 sm:px-6">
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="shrink-0 rounded-control transition-opacity duration-200 hover:opacity-80"
            aria-label="TISMUN home"
          >
            <Logo className="h-9 w-auto" />
          </Link>

          <nav className="hidden items-center gap-7 sm:flex" aria-label="Main">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-4 sm:flex">
          {user ? (
            <div className="flex items-center gap-2.5 text-right">
              <div className="leading-tight">
                <p className="text-sm font-medium text-ink-900">{user.fullName}</p>
                <p className="text-xs text-muted">{subtitleFor(user)}</p>
              </div>
              {isChair(user) ? (
                <Badge tone="teal">
                  <Gavel size={11} strokeWidth={1.5} />
                  Chair
                </Badge>
              ) : isSecretariat(user) ? (
                <Badge tone="teal">
                  <Landmark size={11} strokeWidth={1.5} />
                  Secretariat
                </Badge>
              ) : null}
            </div>
          ) : null}
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut size={15} strokeWidth={1.5} />
            Log out
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          iconOnly
          className="sm:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
        </Button>
      </div>

      {menuOpen ? (
        <div className="border-t border-hairline bg-surface sm:hidden">
          <nav className="flex flex-col px-5 py-2" aria-label="Main">
            {items.map((item) => {
              const active = item.end
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    'rounded-control px-2 py-2.5 text-sm font-medium transition-colors duration-200',
                    active ? 'bg-teal-50 text-teal-700' : 'text-ink-700 hover:bg-ink-50',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center justify-between gap-3 border-t border-hairline px-5 py-3">
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-ink-900">
                {user ? firstNameOf(user) : ''}
              </p>
              <p className="truncate text-xs text-muted">{user?.email}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleSignOut}>
              <LogOut size={15} strokeWidth={1.5} />
              Log out
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
