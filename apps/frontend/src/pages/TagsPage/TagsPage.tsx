import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import {
  useGetTagsQuery,
  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
  Tag,
} from '../../entities/tags/api/tagsApi';
import { Can } from '../../shared/ui/Can';

const PRESET_COLORS = ['#607d8b', '#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0', '#f44336', '#009688'];

function contrast(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? '#000' : '#fff';
}

export function TagsPage() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useGetTagsQuery();
  const [createTag, { isLoading: creating }] = useCreateTagMutation();
  const [updateTag, { isLoading: updating }] = useUpdateTagMutation();
  const [deleteTag] = useDeleteTagMutation();

  const [editing, setEditing] = useState<Tag | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [formError, setFormError] = useState<string | null>(null);

  const tags = data?.data ?? [];

  const openCreate = () => {
    setEditing(null);
    setName('');
    setColor(PRESET_COLORS[0]);
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (tag: Tag) => {
    setEditing(tag);
    setName(tag.name);
    setColor(tag.color ?? PRESET_COLORS[0]);
    setFormError(null);
    setOpen(true);
  };

  const onSubmit = async () => {
    if (!name.trim()) return;
    setFormError(null);
    try {
      if (editing) {
        await updateTag({ id: editing.id, name: name.trim(), color }).unwrap();
      } else {
        await createTag({ name: name.trim(), color }).unwrap();
      }
      setOpen(false);
    } catch (e) {
      const status = (e as { status?: number }).status;
      setFormError(status === 409 ? t('tags.duplicate') : t('tags.saveError'));
    }
  };

  const onDelete = async (tag: Tag) => {
    const msg = tag.usageCount
      ? t('tags.deleteConfirmUsed', { count: tag.usageCount })
      : t('tags.deleteConfirm');
    if (window.confirm(msg)) await deleteTag(tag.id);
  };

  return (
    <Box maxWidth={720}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h5">{t('tags.title')}</Typography>
        <Can permission="tags:create">
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            {t('tags.add')}
          </Button>
        </Can>
      </Box>

      {isLoading && <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>}
      {error && <Alert severity="error">{t('tags.failedToLoad')}</Alert>}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('tags.tag')}</TableCell>
              <TableCell align="right">{t('tags.usage')}</TableCell>
              <TableCell align="right">{t('common.action')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tags.map((tag) => (
              <TableRow key={tag.id} hover>
                <TableCell>
                  <Chip label={tag.name} size="small" sx={{ bgcolor: tag.color ?? '#607d8b', color: contrast(tag.color ?? '#607d8b') }} />
                </TableCell>
                <TableCell align="right">{tag.usageCount ?? 0}</TableCell>
                <TableCell align="right">
                  <Can permission="tags:update">
                    <Tooltip title={t('common.edit')}>
                      <IconButton size="small" onClick={() => openEdit(tag)}><Edit fontSize="small" /></IconButton>
                    </Tooltip>
                  </Can>
                  <Can permission="tags:delete">
                    <Tooltip title={t('common.delete')}>
                      <IconButton size="small" color="error" onClick={() => onDelete(tag)}><Delete fontSize="small" /></IconButton>
                    </Tooltip>
                  </Can>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && tags.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {t('tags.none')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? t('tags.edit') : t('tags.add')}</DialogTitle>
        <DialogContent>
          <TextField
            label={t('tags.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            autoFocus
            sx={{ mt: 1, mb: 2 }}
          />
          <Typography variant="caption" color="text.secondary">{t('tags.color')}</Typography>
          <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
            {PRESET_COLORS.map((c) => (
              <Box
                key={c}
                onClick={() => setColor(c)}
                sx={{
                  width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                  border: color === c ? '3px solid' : '2px solid transparent',
                  borderColor: color === c ? 'text.primary' : 'transparent',
                }}
              />
            ))}
          </Box>
          <Box mt={2}>
            <Chip label={name || t('tags.preview')} size="small" sx={{ bgcolor: color, color: contrast(color) }} />
          </Box>
          {formError && <Alert severity="error" sx={{ mt: 2 }}>{formError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={onSubmit} disabled={creating || updating || !name.trim()}>
            {creating || updating ? <CircularProgress size={20} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
