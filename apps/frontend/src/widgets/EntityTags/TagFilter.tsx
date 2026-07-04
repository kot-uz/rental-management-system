import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, Box, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useGetTagsQuery } from '../../entities/tags/api/tagsApi';

interface Props {
  value: string;
  onChange: (tagId: string) => void;
}

/** Dropdown to filter a list by a single tag. Hidden if the org has no tags. */
export function TagFilter({ value, onChange }: Props) {
  const { t } = useTranslation();
  const { data } = useGetTagsQuery();
  const tags = data?.data ?? [];
  if (tags.length === 0) return null;

  return (
    <FormControl size="small" sx={{ minWidth: 160 }}>
      <InputLabel>{t('tags.filterLabel')}</InputLabel>
      <Select value={value} label={t('tags.filterLabel')} onChange={(e) => onChange(e.target.value)}>
        <MenuItem value="">{t('common.all')}</MenuItem>
        {tags.map((tag) => (
          <MenuItem key={tag.id} value={tag.id}>
            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                label={tag.name}
                size="small"
                sx={{ bgcolor: tag.color ?? '#607d8b', color: '#fff', height: 18 }}
              />
              {tag.usageCount != null && (
                <Box component="span" sx={{ color: 'text.secondary', fontSize: 12 }}>({tag.usageCount})</Box>
              )}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
