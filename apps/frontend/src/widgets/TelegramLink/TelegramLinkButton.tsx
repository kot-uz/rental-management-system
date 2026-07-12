import React, { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { TelegramLink } from '../../entities/telegram/api/telegramApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
  const [opened, setOpened] = useState(false);

  const onClick = async () => {
    setLoading(true);
    try {
      const res = await requestLink();
      if (res.configured && res.url) {
        window.open(res.url, '_blank', 'noopener');
        setOpened(true);
      } else {
        toast.warning(t('telegram.notConfigured'));
      }
    } catch {
      toast.warning(t('telegram.linkFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={linked ? 'default' : 'secondary'}
          className={cn(
            'gap-1',
            linked &&
              'border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300',
          )}
        >
          <Send className="h-3 w-3" />
          {linked ? t('telegram.linked') : t('telegram.notLinked')}
        </Badge>
        <Button size="sm" variant="outline" onClick={onClick} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {linked ? t('telegram.relink') : t('telegram.link')}
        </Button>
      </div>
      {opened && (
        <p className="mt-1 text-xs text-muted-foreground">{t('telegram.openedHint')}</p>
      )}
    </div>
  );
}
