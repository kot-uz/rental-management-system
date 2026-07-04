import React from 'react';
import { Box, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'uz', label: 'UZ' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language?.slice(0, 2);

  return (
    <Box sx={{ display: 'flex', gap: 0.5, mr: 1 }}>
      {LANGUAGES.map((lang) => (
        <Button
          key={lang.code}
          size="small"
          variant={current === lang.code ? 'contained' : 'text'}
          onClick={() => i18n.changeLanguage(lang.code)}
          sx={{ minWidth: 36, px: 0.5, py: 0.25, fontSize: 12, fontWeight: 600 }}
        >
          {lang.label}
        </Button>
      ))}
    </Box>
  );
}
