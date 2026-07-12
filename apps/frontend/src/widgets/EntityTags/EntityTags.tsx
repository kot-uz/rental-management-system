import React, { useRef, useState } from 'react';
import { Loader2, Tag as TagIcon, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useGetTagsQuery,
  useGetEntityTagsQuery,
  useCreateTagMutation,
  useAssignTagMutation,
  useUnassignTagMutation,
  Tag,
} from '../../entities/tags/api/tagsApi';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { Input } from '@/components/ui/input';

interface Props {
  entityType: string;
  entityId: string;
}

const DEFAULT_COLOR = '#607d8b';

// Readable text colour for a given hex background.
function contrast(hex?: string | null): string {
  if (!hex) return '#fff';
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? '#000' : '#fff';
}

export function EntityTags({ entityType, entityId }: Props) {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const canEdit = can('tags:update');

  const { data: entityData, isLoading } = useGetEntityTagsQuery({ entityType, entityId });
  const { data: allData } = useGetTagsQuery();
  const [createTag] = useCreateTagMutation();
  const [assignTag] = useAssignTagMutation();
  const [unassignTag] = useUnassignTagMutation();
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const assigned = entityData?.data ?? [];
  const assignedIds = new Set(assigned.map((tag) => tag.id));
  const options = (allData?.data ?? []).filter(
    (tag) =>
      !assignedIds.has(tag.id) &&
      (!input.trim() || tag.name.toLowerCase().includes(input.trim().toLowerCase())),
  );

  const onAdd = async (value: string | Tag) => {
    setBusy(true);
    try {
      let tagId: string;
      if (typeof value === 'string') {
        const name = value.trim();
        if (!name) return;
        const existing = (allData?.data ?? []).find((x) => x.name === name.toLowerCase());
        tagId = existing
          ? existing.id
          : (await createTag({ name, color: DEFAULT_COLOR }).unwrap()).data.id;
      } else {
        tagId = value.id;
      }
      await assignTag({ id: tagId, entityType, entityId }).unwrap();
      setInput('');
    } finally {
      setBusy(false);
    }
  };

  const onRemove = (tagId: string) => unassignTag({ id: tagId, entityType, entityId });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <TagIcon className="h-4 w-4 text-muted-foreground" />
      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      {assigned.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ backgroundColor: tag.color ?? DEFAULT_COLOR, color: contrast(tag.color) }}
        >
          {tag.name}
          {canEdit && (
            <button
              type="button"
              onClick={() => void onRemove(tag.id)}
              className="ml-0.5 rounded-full opacity-70 hover:opacity-100"
              aria-label={`Remove ${tag.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      {assigned.length === 0 && !isLoading && (
        <span className="text-sm text-muted-foreground">{t('tags.none')}</span>
      )}
      {canEdit && (
        <div
          ref={containerRef}
          className="relative min-w-52"
          onBlur={(e) => {
            if (!containerRef.current?.contains(e.relatedTarget as Node)) setFocused(false);
          }}
        >
          <Input
            value={input}
            disabled={busy}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void onAdd(input);
              }
              if (e.key === 'Escape') setFocused(false);
            }}
            placeholder={t('tags.addPlaceholder')}
            className="h-8 text-sm"
          />
          {focused && options.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-auto rounded-md border bg-popover p-1 shadow-md">
              {options.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void onAdd(tag)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: tag.color ?? DEFAULT_COLOR }}
                  />
                  {tag.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
