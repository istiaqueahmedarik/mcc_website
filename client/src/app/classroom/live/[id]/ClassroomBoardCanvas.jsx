"use client";

import { useCallback, useMemo } from 'react';
import { useSync } from '@tldraw/sync';
import { Tldraw } from 'tldraw';
import { post_with_token } from '@/lib/action';

function serverWsBase() {
  const configured = (process.env.NEXT_PUBLIC_SERVER_URL || '').replace(/\/+$/, '');
  const httpBase = configured || (typeof window !== 'undefined' ? window.location.origin : '');
  return httpBase.replace(/^http/i, 'ws');
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export default function ClassroomBoardCanvas({ classroomId, role, sessionId }) {
  const assets = useMemo(() => ({
    upload: async (_asset, file) => ({ src: await fileToDataUrl(file) }),
    resolve: (asset) => asset?.props?.src || asset?.src || '',
  }), []);

  const uri = useCallback(async () => {
    const res = await post_with_token(`classroom/${classroomId}/board/join-token`, {});
    if (res?.error || !res?.websocketPath) {
      throw new Error(res?.error || 'Failed to join board');
    }
    return `${serverWsBase()}${res.websocketPath}`;
  }, [classroomId]);

  const handleMount = useCallback((editor) => {
    if (role !== 'trainer') {
      editor.updateInstanceState({ isReadonly: true });
    }
  }, [role]);

  const store = useSync({
    uri,
    assets,
    roomId: sessionId || classroomId,
    onMount: handleMount,
  });

  if (store.status === 'loading') {
    return (
      <div className="grid h-full place-items-center bg-muted/20 text-sm text-muted-foreground">
        Connecting board...
      </div>
    );
  }

  if (store.status === 'error') {
    return (
      <div className="grid h-full place-items-center bg-muted/20 px-6 text-center text-sm text-red-600">
        {store.error?.message || 'Board connection failed'}
      </div>
    );
  }

  return (
    <Tldraw
      store={store.store}
      autoFocus={false}
      onMount={handleMount}
    />
  );
}
