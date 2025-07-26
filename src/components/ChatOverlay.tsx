import { useEffect, useState } from 'react';
import { useChat } from 'ai/react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface ChatOverlayProps {
    onThreadIdChange: (threadId: string) => void;
}

export function ChatOverlay({ onThreadIdChange }: ChatOverlayProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [threadId, setThreadId] = useState<string | null>(null);
    const createThread = useMutation(api.chat.createThread);

    // Initialize thread on mount
    useEffect(() => {
        async function initThread() {
            const { threadId: newThreadId } = await createThread();
            setThreadId(newThreadId);
            onThreadIdChange(newThreadId);
        }
        initThread();
    }, []);

    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: `${import.meta.env.VITE_CONVEX_URL?.replace('.cloud', '.site')}/chat`,
        body: {
            threadId,
        },
        onError: (error) => {
            console.error('Chat error:', error);
        },
    });

    if (!threadId) {
        return null;
    }

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                width: isOpen ? '400px' : '60px',
                height: isOpen ? '600px' : '60px',
                background: 'rgba(17, 24, 39, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(75, 85, 99, 0.3)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: '16px',
                    borderBottom: '1px solid rgba(75, 85, 99, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <h3 style={{ margin: 0, color: '#f3f4f6', fontSize: '16px', fontWeight: 'bold' }}>
                    Life Copilot
                </h3>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        fontSize: '20px',
                        padding: '4px',
                    }}
                >
                    {isOpen ? '−' : '+'}
                </button>
            </div>

            {isOpen && (
                <>
                    {/* Messages */}
                    <div
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                        }}
                    >
                        {messages.length === 0 && (
                            <div style={{ color: '#9ca3af', textAlign: 'center', marginTop: '20px' }}>
                                <p style={{ marginBottom: '8px' }}>👋 Hi! I'm your Life Copilot.</p>
                                <p style={{ fontSize: '14px' }}>
                                    I can help you manage goals, create projects, and analyze decisions.
                                    Try asking:
                                </p>
                                <ul style={{ fontSize: '14px', textAlign: 'left', marginTop: '12px' }}>
                                    <li>Create a goal to learn machine learning</li>
                                    <li>Should I take a job at a startup or big tech?</li>
                                    <li>What projects would help me become healthier?</li>
                                </ul>
                            </div>
                        )}
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                                }}
                            >
                                <div
                                    style={{
                                        background: message.role === 'user' ? '#3b82f6' : 'rgba(55, 65, 81, 0.5)',
                                        color: '#f3f4f6',
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        maxWidth: '80%',
                                        fontSize: '14px',
                                        lineHeight: '1.5',
                                    }}
                                >
                                    {message.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af' }}>
                                <div className="loading-dots">
                                    <span>•</span><span>•</span><span>•</span>
                                </div>
                                <span style={{ fontSize: '14px' }}>Thinking...</span>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <form
                        onSubmit={handleSubmit}
                        style={{
                            padding: '16px',
                            borderTop: '1px solid rgba(75, 85, 99, 0.3)',
                            display: 'flex',
                            gap: '8px',
                        }}
                    >
                        <input
                            value={input}
                            onChange={handleInputChange}
                            placeholder="Ask about your goals and decisions..."
                            style={{
                                flex: 1,
                                background: 'rgba(55, 65, 81, 0.5)',
                                border: '1px solid rgba(75, 85, 99, 0.3)',
                                borderRadius: '8px',
                                padding: '10px 14px',
                                color: '#f3f4f6',
                                fontSize: '14px',
                                outline: 'none',
                            }}
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            style={{
                                background: '#3b82f6',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '10px 20px',
                                color: 'white',
                                fontWeight: 'bold',
                                cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                                opacity: isLoading || !input.trim() ? 0.5 : 1,
                                fontSize: '14px',
                            }}
                        >
                            Send
                        </button>
                    </form>
                </>
            )}
        </div>
    );
}

// Add loading animation styles
const style = document.createElement('style');
style.textContent = `
  .loading-dots span {
    animation: blink 1.4s infinite;
    animation-fill-mode: both;
  }
  .loading-dots span:nth-child(2) {
    animation-delay: 0.2s;
  }
  .loading-dots span:nth-child(3) {
    animation-delay: 0.4s;
  }
  @keyframes blink {
    0%, 60%, 100% {
      opacity: 0.2;
    }
    30% {
      opacity: 1;
    }
  }
`;
document.head.appendChild(style); 