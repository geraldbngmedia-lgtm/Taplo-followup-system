import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PaperPlaneTilt, SpinnerGap, PencilSimple, Copy } from '@phosphor-icons/react';
import { API } from '@/config';
import axios from 'axios';

export default function FollowUpDialog({ open, onOpenChange, candidate, onFollowUpSent }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [customContext, setCustomContext] = useState('');
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const generateMessage = async () => {
        setLoading(true);
        setError('');
        setMessage(null);
        try {
            const { data } = await axios.post(
                `${API}/candidates/${candidate.id}/generate-followup`,
                { candidate_id: candidate.id, custom_context: customContext },
                { withCredentials: true }
            );
            setMessage(data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to generate message');
        }
        setLoading(false);
    };

    const openMailto = () => {
        if (!message) return;
        const subject = encodeURIComponent(message.subject);
        const body = encodeURIComponent(message.body);
        window.open(`mailto:${message.candidate_email}?subject=${subject}&body=${body}`, '_blank');
        if (onFollowUpSent) onFollowUpSent(candidate.id);
        onOpenChange(false);
    };

    const copyToClipboard = async () => {
        if (!message) return;
        const text = `Subject: ${message.subject}\n\n${message.body}`;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClose = (v) => {
        if (!v) {
            setMessage(null);
            setCustomContext('');
            setError('');
        }
        onOpenChange(v);
    };

    if (!candidate) return null;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="bg-surface-card border-[#2A2E39] text-[#F1F3F5] max-w-xl" data-testid="followup-dialog">
                <DialogHeader>
                    <DialogTitle className="font-heading text-xl">Follow Up with {candidate.name}</DialogTitle>
                    <DialogDescription className="text-[#6E7781]">
                        Generate a personalised AI message and send via your email client
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    {/* Candidate context */}
                    <div className="bg-surface-base border border-[#2A2E39] rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-[#6E7781]">Role:</span>
                            <span className="text-[#F1F3F5]">{candidate.role}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-[#6E7781]">Group:</span>
                            <span className="text-[#F1F3F5] capitalize">{candidate.group?.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-[#6E7781]">Email:</span>
                            <span className="text-[#F1F3F5]">{candidate.email}</span>
                        </div>
                    </div>

                    {/* Custom context */}
                    {!message && (
                        <>
                            <div>
                                <label className="text-[#A0AAB2] text-sm block mb-1.5">Additional context (optional)</label>
                                <textarea
                                    value={customContext}
                                    onChange={(e) => setCustomContext(e.target.value)}
                                    className="w-full bg-surface-base border border-[#2A2E39] text-[#F1F3F5] placeholder:text-[#6E7781] rounded-lg p-3 text-sm min-h-[60px] resize-none focus:border-ocean focus:ring-1 focus:ring-ocean focus:outline-none"
                                    placeholder="e.g., We have a new Senior Engineer opening that might interest them..."
                                    data-testid="followup-context-input"
                                />
                            </div>
                            <Button
                                onClick={generateMessage}
                                disabled={loading}
                                className="w-full bg-ocean hover:bg-ocean-hover text-surface-base rounded-full font-medium h-11"
                                data-testid="followup-generate-button"
                            >
                                {loading ? (
                                    <><SpinnerGap className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                                ) : (
                                    <><PencilSimple className="w-4 h-4 mr-2" /> Generate AI Message</>
                                )}
                            </Button>
                        </>
                    )}

                    {/* Generated message */}
                    {message && (
                        <div className="space-y-4">
                            <div className="bg-surface-base border border-[#2A2E39] rounded-xl p-4">
                                <p className="text-xs text-[#6E7781] mb-1">Subject</p>
                                <p className="text-sm text-[#F1F3F5] font-medium mb-4" data-testid="followup-subject">{message.subject}</p>
                                <p className="text-xs text-[#6E7781] mb-1">Body</p>
                                <pre className="text-sm text-[#A0AAB2] whitespace-pre-wrap font-body leading-relaxed" data-testid="followup-body">{message.body}</pre>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    onClick={copyToClipboard}
                                    variant="outline"
                                    className="flex-1 border-[#2A2E39] text-[#A0AAB2] hover:bg-white/5 rounded-full"
                                    data-testid="followup-copy-button"
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    {copied ? 'Copied!' : 'Copy'}
                                </Button>
                                <Button
                                    onClick={openMailto}
                                    className="flex-1 bg-coral hover:bg-coral-hover text-surface-base rounded-full font-medium"
                                    data-testid="followup-send-button"
                                >
                                    <PaperPlaneTilt className="w-4 h-4 mr-2" />
                                    Open Email Client
                                </Button>
                            </div>
                            <Button
                                onClick={() => { setMessage(null); }}
                                variant="ghost"
                                className="w-full text-[#6E7781] hover:text-[#A0AAB2]"
                                data-testid="followup-regenerate-button"
                            >
                                Regenerate message
                            </Button>
                        </div>
                    )}

                    {error && <p className="text-red-400 text-sm" data-testid="followup-error">{error}</p>}
                </div>
            </DialogContent>
        </Dialog>
    );
}
