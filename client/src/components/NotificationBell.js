"use client";

import { useEffect, useState, useRef } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import ProgressLink from './ProgressLink';

function areNotificationsEqual(prev, next) {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    const a = prev[i];
    const b = next[i];
    if (a.id !== b.id || a.read !== b.read) return false;
  }
  return true;
}

export default function NotificationBell({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastFetchRef = useRef(0);

  const fetchNotifications = async () => {
    // Cooldown: skip if fetched within the last 30 seconds.
    // Real-time updates come via Supabase broadcast, so aggressive polling is unnecessary.
    const now = Date.now();
    if (now - lastFetchRef.current < 30000) return;
    lastFetchRef.current = now;

    try {
      const res = await fetch('/api/classroom/notifications/list', {
        method: 'GET',
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.notifications)) {
        const next = data.notifications;
        const unread = next.filter(n => !n.read).length;
        setNotifications(prev =>
          areNotificationsEqual(prev, next) ? prev : next
        );
        setUnreadCount(prev => (prev === unread ? prev : unread));
      }
    } catch (error) {
      // Silent: will retry on next event.
    }
  };

  const markAllRead = async () => {
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await fetch('/api/classroom/notifications/read', {
        method: 'POST',
        cache: 'no-store',
      });
    } catch (error) {
      // Optimistic update already applied; ignore transient failures.
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Only use visibilitychange (not focus) to avoid duplicate fires on tab switch.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchNotifications();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Event-driven delivery: the server broadcasts a content-free signal to
    // this user's channel whenever a notification is created. We refetch the
    // actual content over the authenticated API.
    let channel;
    if (userId) {
      channel = supabase
        .channel(`notifications:${userId}`)
        .on('broadcast', { event: 'new_notification' }, () => {
          fetchNotifications();
        })
        .subscribe();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-background">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between p-2 font-semibold text-sm">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          notifications.map((notif) => (
            <DropdownMenuItem key={notif.id} className={`flex flex-col items-start p-3 ${!notif.read ? 'bg-muted/40 font-medium' : ''}`}>
              <div className="flex justify-between w-full">
                <span className="text-sm font-semibold">{notif.title}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notif.message}</p>
              {notif.link && (
                <ProgressLink href={notif.link} className="text-xs text-primary mt-1 hover:underline">
                  View details
                </ProgressLink>
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
