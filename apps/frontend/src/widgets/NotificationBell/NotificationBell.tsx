import React from 'react';
import { Bell } from 'lucide-react';
import {
  useGetUnreadCountQuery,
  useGetNotificationsQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
} from '../../entities/notifications/api/notificationsApi';
import { formatDate } from '../../shared/utils/formatMoney';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const { data: countData } = useGetUnreadCountQuery();
  const { data: notifs, refetch } = useGetNotificationsQuery({
    unreadOnly: false,
  });
  const [markRead] = useMarkReadMutation();
  const [markAllRead] = useMarkAllReadMutation();

  const count = typeof countData?.data === 'number' ? countData.data : 0;
  const notifications = notifs?.data ?? [];

  return (
    <Popover onOpenChange={(open) => open && void refetch()}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {count > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => void markAllRead()}>
              Mark all read
            </Button>
          )}
        </div>
        <Separator />
        {notifications.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No notifications</p>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="space-y-1 p-2">
              {notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => void markRead(n.id)}
                  className={cn(
                    'w-full rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                    n.isRead ? 'border-transparent' : 'border-emerald-500/60',
                  )}
                >
                  <span className="block font-medium">{n.title}</span>
                  <span className="block text-muted-foreground">{n.body}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground/70">
                    {formatDate(n.createdAt)}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
