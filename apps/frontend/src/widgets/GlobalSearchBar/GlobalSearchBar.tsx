import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, Search } from 'lucide-react';
import { useSearchQuery, SearchResult } from '../../entities/search/api/searchApi';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ROUTE_BY_TYPE: Record<SearchResult['type'], (id: string) => string> = {
  apartment: (id) => `/app/apartments/${id}`,
  tenant: (id) => `/app/tenants/${id}`,
  repair: (id) => `/app/repairs/${id}`,
  contractor: () => `/app/contractors`,
};

export function GlobalSearchBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(input.trim()), 250);
    return () => clearTimeout(id);
  }, [input]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const { data, isFetching } = useSearchQuery(debounced, { skip: debounced.length < 2 });
  const options = data?.data ?? [];
  const open = focused && input.trim().length > 0;

  const select = (option: SearchResult) => {
    navigate(ROUTE_BY_TYPE[option.type](option.id));
    setInput('');
    setFocused(false);
  };

  return (
    <div ref={containerRef} className="relative w-40 sm:w-72 md:w-96">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onFocus={() => setFocused(true)}
        onKeyDown={(e) => e.key === 'Escape' && setFocused(false)}
        placeholder={t('search.placeholder')}
        className="h-9 pl-8"
      />
      {isFetching && (
        <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {debounced.length < 2 ? t('search.hint') : t('search.noResults')}
            </p>
          ) : (
            options.map((option) => (
              <button
                key={`${option.type}:${option.id}`}
                type="button"
                onClick={() => select(option)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm',
                  'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:outline-none',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{option.title}</span>
                  {option.subtitle && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {option.subtitle}
                    </span>
                  )}
                </span>
                <Badge variant="outline" className="shrink-0 text-xs font-normal">
                  {t(`search.type.${option.type}`)}
                </Badge>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
