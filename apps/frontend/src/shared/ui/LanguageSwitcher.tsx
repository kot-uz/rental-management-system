import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'uz', label: 'UZ' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language?.slice(0, 2);

  return (
    <div className="flex gap-1">
      {LANGUAGES.map((lang) => (
        <Button
          key={lang.code}
          size="sm"
          variant={current === lang.code ? 'default' : 'ghost'}
          onClick={() => i18n.changeLanguage(lang.code)}
          className="h-7 min-w-9 px-1.5 text-xs font-semibold"
        >
          {lang.label}
        </Button>
      ))}
    </div>
  );
}
