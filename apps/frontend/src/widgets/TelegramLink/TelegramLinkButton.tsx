import React, { useState } from 'react';
import { Box, Button, Chip, CircularProgress, Snackbar, Alert, Typography } from '@mui/material';
import { Telegram } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { TelegramLink } from '../../entities/telegram/api/telegramApi';

interface Props {
  /** Whether the subject already has a bound chat id. */
  linked: boolean;
  /** Triggers link-token creation on the backend; returns the deep link. */
  requestLink: () => Promise<TelegramLink>;
}

/**
 * Telegram binding control reused for tenants and the owner profile. Because the
 * Bot API can't DM by @username, the subject must press Start once: this button
 * mints a one-time deep link and opens it. The linked badge reflects the stored
 * chat id; it flips to "linked" after the subject presses Start (next refetch).
 */
export function TelegramLinkButton({ linked, requestLink }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);

  const onClick = async () => {
    setLoading(true);
    try {
      const res = await requestLink();
      if (res.configured && res.url) {
        window.open(res.url, '_blank', 'noopener');
        setOpened(true);
      } else {
        setError(t('telegram.notConfigured'));
      }
    } catch {
      setError(t('telegram.linkFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
        <Chip
          icon={<Telegram />}
          size="small"
          color={linked ? 'success' : 'default'}
          label={linked ? t('telegram.linked') : t('telegram.notLinked')}
        />
        <Button
          size="small"
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <Telegram />}
          onClick={onClick}
          disabled={loading}
        >
          {linked ? t('telegram.relink') : t('telegram.link')}
        </Button>
      </Box>
      {opened && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {t('telegram.openedHint')}
        </Typography>
      )}
      <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError(null)}>
        <Alert severity="warning" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
