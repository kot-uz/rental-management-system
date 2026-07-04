import React, { useState } from 'react';
import { Box, Chip, Autocomplete, TextField, CircularProgress } from '@mui/material';
import { LocalOffer } from '@mui/icons-material';
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

  const assigned = entityData?.data ?? [];
  const assignedIds = new Set(assigned.map((tag) => tag.id));
  const options = (allData?.data ?? []).filter((tag) => !assignedIds.has(tag.id));

  const onAdd = async (value: string | Tag | null) => {
    if (!value) return;
    setBusy(true);
    try {
      let tagId: string;
      if (typeof value === 'string') {
        const name = value.trim();
        if (!name) return;
        const existing = (allData?.data ?? []).find((x) => x.name === name.toLowerCase());
        tagId = existing ? existing.id : (await createTag({ name, color: DEFAULT_COLOR }).unwrap()).data.id;
      } else {
        tagId = value.id;
      }
      await assignTag({ id: tagId, entityType, entityId }).unwrap();
    } finally {
      setBusy(false);
    }
  };

  const onRemove = (tagId: string) => unassignTag({ id: tagId, entityType, entityId });

  return (
    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
      <LocalOffer fontSize="small" sx={{ color: 'text.secondary' }} />
      {isLoading && <CircularProgress size={16} />}
      {assigned.map((tag) => (
        <Chip
          key={tag.id}
          label={tag.name}
          size="small"
          onDelete={canEdit ? () => onRemove(tag.id) : undefined}
          sx={{ bgcolor: tag.color ?? DEFAULT_COLOR, color: contrast(tag.color) }}
        />
      ))}
      {assigned.length === 0 && !isLoading && (
        <Box component="span" sx={{ color: 'text.secondary', fontSize: 13 }}>{t('tags.none')}</Box>
      )}
      {canEdit && (
        <Autocomplete
          key={assigned.length}
          freeSolo
          size="small"
          options={options}
          getOptionLabel={(o) => (typeof o === 'string' ? o : o.name)}
          disabled={busy}
          sx={{ minWidth: 200 }}
          onChange={(_e, value) => onAdd(value)}
          renderInput={(params) => (
            <TextField {...params} placeholder={t('tags.addPlaceholder')} variant="standard" />
          )}
        />
      )}
    </Box>
  );
}
