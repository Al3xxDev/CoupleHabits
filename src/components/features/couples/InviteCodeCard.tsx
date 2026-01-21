import { Copy } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface InviteCodeCardProps {
    code: string;
}

export function InviteCodeCard({ code }: InviteCodeCardProps) {
    const t = useTranslations('InviteCode');
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(code);
            } else {
                // Fallback
                const textArea = document.createElement("textarea");
                textArea.value = code;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                } catch (err) {
                    console.error('Fallback copy failed', err);
                }
                document.body.removeChild(textArea);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed', err);
            // Optionally set error state or alert
        }
    };

    return (
        <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg mb-6 relative overflow-hidden">
            <div className="relative z-10">
                <h2 className="text-lg font-semibold opacity-90 mb-2">{t('waitingTitle')}</h2>
                <p className="text-indigo-100 text-sm mb-4">
                    {t('shareInstructions')}
                </p>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between border border-white/20">
                    <span className="font-mono text-3xl font-bold tracking-widest">{code}</span>
                    <button
                        onClick={handleCopy}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        title="Copy Code"
                    >
                        <Copy size={20} />
                    </button>
                </div>
                {copied && <p className="text-xs text-indigo-200 mt-2 text-right">{t('copied')}</p>}
            </div>

            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/50 rounded-full blur-2xl"></div>
        </div>
    );
}
