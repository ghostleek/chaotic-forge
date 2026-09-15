'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, QrCode } from 'lucide-react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import styles from './room-invite.module.css';

export function RoomInvite({ roomId }: { roomId: string }) {
  const [url, setUrl] = useState('');
  const [notice, setNotice] = useState('');
  const [manual, setManual] = useState(false);
  function inviteUrl() {
    // Share only the public join route, never participant capabilities or query strings.
    return new URL(
      `/party/${encodeURIComponent(roomId)}`,
      window.location.origin,
    ).href;
  }
  async function copy() {
    const link = inviteUrl();
    setUrl(link);
    try {
      await navigator.clipboard.writeText(link);
      setManual(false);
      setNotice('Invite link copied. Share it with your friends.');
    } catch {
      setManual(true);
      setNotice(
        'Could not copy automatically. Select and copy the link below.',
      );
    }
  }
  return (
    <div className={styles.invite}>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.copyButton}
          onClick={() => void copy()}
        >
          <Copy size={18} aria-hidden="true" />
          Copy invite link
        </button>
        <Dialog
          onOpenChange={(open) => {
            if (open) setUrl(inviteUrl());
          }}
        >
          <DialogTrigger>
            <QrCode size={18} aria-hidden="true" />
            QR code
          </DialogTrigger>
          <DialogContent className={styles.modal}>
            <DialogTitle className={styles.title}>Join this room</DialogTitle>
            <DialogDescription className={styles.description}>
              Scan with your phone’s camera, then enter your name to join.
            </DialogDescription>
            {url && (
              <QRCodeSVG
                value={url}
                size={256}
                level="M"
                marginSize={4}
                bgColor="#ffffff"
                fgColor="#000000"
                title="QR code to join this room"
                className={styles.qr}
              />
            )}
            <label className={styles.linkLabel}>
              Room invite link
              <input
                value={url}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
              />
            </label>
            <button
              type="button"
              className={styles.copyButton}
              onClick={() => void copy()}
            >
              Copy invite link
            </button>
            <output>{notice}</output>
          </DialogContent>
        </Dialog>
      </div>
      <output>{notice}</output>
      {manual && (
        <label className={styles.linkLabel}>
          Room invite link
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
          />
        </label>
      )}
    </div>
  );
}
