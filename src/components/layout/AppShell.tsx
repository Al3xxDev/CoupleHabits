'use client';
import { ReactNode, useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { services } from '@/services/container';

export function AppShell({ children }: { children: ReactNode }) {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        // Initial check
        setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

        const handleOnline = () => {
            setIsOnline(true);
            // Maybe trigger manual sync attempt or let SyncEngine handle it
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
            {/* Network Status Indicator */}
            {!isOnline && (
                <div className="bg-amber-100 text-amber-800 px-4 py-1 text-sm flex items-center justify-center gap-2">
                    <WifiOff size={14} />
                    <span>Offline Mode - Changes will sync when online</span>
                </div>
            )}

            <main className="max-w-md mx-auto min-h-screen shadow-sm bg-white">
                {children}
            </main>
        </div>
    );
}
