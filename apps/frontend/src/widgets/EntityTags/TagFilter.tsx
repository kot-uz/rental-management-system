import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGetTagsQuery } from '../../entities/tags/api/tagsApi';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  value: string;
  onChange: (tagId: string) => void;
}

const ALL = '__all__';

/** Dropdown to filter a list by a single tag. Hidden if the org has no tags. */
export function TagFilter({ value, onChange }: Props) {
  const { t } = useTranslation();
  const { data } = useGetTagsQuery();
  const tags = data?.data ?? [];
  if (tags.length === 0) return null;

  return (
    <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? '' : v)}>
      <SelectTrigger className="h-9 w-40">
        <SelectValue placeholder={t('tags.filterLabel')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{t('common.all')}</SelectItem>
        {tags.map((tag) => (
          <SelectItem key={tag.id} value={tag.id}>
            <span className="flex items-center gap-2">
              <span
                className="inline-flex h-4 items-center rounded-full px-2 text-[11px] font-medium text-white"
                style={{ backgroundColor: tag.color ?? '#607d8b' }}
              >
                {tag.name}
              </span>
              {tag.usageCount != null && (
                <span className="text-xs text-muted-foreground">({tag.usageCount})</span>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
