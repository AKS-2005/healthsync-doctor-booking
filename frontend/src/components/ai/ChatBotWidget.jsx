import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { aiApi } from '../../services/api';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  Calendar, 
  Clock, 
  Stethoscope, 
  ArrowRight, 
  RefreshCw, 
  LogIn, 
  AlertCircle, 
  ShieldCheck,
  ChevronDown
} from 'lucide-react';

export const ChatBotWidget = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [hasUnread, setHasUnread] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Dynamic initial greeting and suggestions based on login status
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await aiApi.getSuggestions();
        if (res.data.success) {
          setSuggestions(res.data.data.suggestions || []);
        }
      } catch (err) {
        // Fallback default suggestions
        if (isAuthenticated) {
          setSuggestions([
            '📅 When is my next appointment?',
            '📋 Show my recent consultations',
            '🩺 Recommend a doctor for my symptoms',
            '🔒 How does 5-minute slot lock work?'
          ]);
        } else {
          setSuggestions([
            '🩺 Which doctor should I consult for migraine?',
            '⭐ Show top cardiologists and fees',
            '🔒 How does 5-minute slot reservation work?',
            '🕒 What are clinic hours and policies?'
          ]);
        }
      }
    };

    fetchInitialData();

    // Reset initial message when auth state changes
    if (isAuthenticated) {
      setMessages([
        {
          id: 'welcome-auth',
          sender: 'assistant',
          text: `Hello **${user?.name || 'there'}**! 👋 I'm your HealthSync Clinical & Scheduling Assistant.\n\nI have access to your live appointment records in our database. How can I help you today?`,
          timestamp: new Date()
        }
      ]);
    } else {
      setMessages([
        {
          id: 'welcome-guest',
          sender: 'assistant',
          text: `Welcome to **HealthSync**! 🩺 I can help you discover specialist doctors, check real-time consultation fees, and explain our 5-minute slot locking system.\n\n*(Tip: Log in anytime to view your personal bookings and medical history!)*`,
          timestamp: new Date()
        }
      ]);
    }
  }, [isAuthenticated, user?.name]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend = null) => {
    const query = (textToSend || inputText).trim();
    if (!query || loading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const historyPayload = messages.slice(-4).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const res = await aiApi.chat(query, historyPayload);

      if (res.data.success) {
        const { reply, cards, suggestions: newSuggestions } = res.data.data;
        const botMessage = {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          text: reply,
          cards: cards || [],
          timestamp: new Date()
        };

        setMessages((prev) => [...prev, botMessage]);
        if (newSuggestions && newSuggestions.length > 0) {
          setSuggestions(newSuggestions);
        }
      } else {
        throw new Error(res.data.message || 'Failed to get answer');
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ I'm sorry, I encountered a temporary issue connecting to the service. Please try again or visit your [Dashboard](/dashboard).`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `clear-${Date.now()}`,
        sender: 'assistant',
        text: isAuthenticated
          ? `Chat history reset. How can I assist you with your appointments or doctor search, **${user?.name}**?`
          : `Chat history reset. What medical question or doctor inquiry can I assist you with?`,
        timestamp: new Date()
      }
    ]);
  };

  const renderFormattedText = (text) => {
    if (!text) return null;

    // Split text into lines to render headers, bullet points, and markdown cleanly
    const lines = text.split('\n');
    return (
      <div className="space-y-1 text-sm leading-relaxed">
        {lines.map((line, idx) => {
          let cleanLine = line.trim();
          if (!cleanLine) return <div key={idx} className="h-1.5" />;

          // Headers
          if (cleanLine.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-semibold text-slate-900 mt-2 mb-1 flex items-center gap-1.5">
                {cleanLine.replace('### ', '')}
              </h4>
            );
          }
          if (cleanLine.startsWith('## ')) {
            return (
              <h3 key={idx} className="font-bold text-slate-900 mt-2 mb-1">
                {cleanLine.replace('## ', '')}
              </h3>
            );
          }

          // Bullet points
          if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ')) {
            const content = cleanLine.substring(2);
            return (
              <div key={idx} className="flex items-start gap-2 text-slate-700">
                <span className="text-teal-600 font-bold leading-5">•</span>
                <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(content) }} />
              </div>
            );
          }

          // Numbered lists
          if (/^\d+\.\s/.test(cleanLine)) {
            const dotIdx = cleanLine.indexOf('.');
            const num = cleanLine.substring(0, dotIdx + 1);
            const content = cleanLine.substring(dotIdx + 1);
            return (
              <div key={idx} className="flex items-start gap-2 text-slate-700">
                <span className="font-semibold text-teal-700">{num}</span>
                <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(content) }} />
              </div>
            );
          }

          return (
            <p key={idx} className="text-slate-700" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(cleanLine) }} />
          );
        })}
      </div>
    );
  };

  const formatInlineMarkdown = (str) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-slate-800">$1</em>')
      .replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 bg-slate-100 text-teal-800 rounded text-xs font-mono">$1</code>');
  };

  return (
    <>
      {/* ========================================================
          1. FLOATING ACTION BUTTON (BOTTOM-RIGHT)
      ======================================================== */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 text-white rounded-full shadow-xl shadow-teal-700/25 hover:shadow-2xl hover:shadow-teal-700/35 hover:scale-105 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-teal-400/40"
            aria-label="Open HealthSync AI Assistant"
          >
            {/* Pulsing ring indicator */}
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
            </span>

            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-sm group-hover:rotate-12 transition-transform duration-300">
              <Bot className="w-5 h-5 text-teal-100" />
            </div>

            <div className="flex flex-col text-left pr-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-200 leading-none">
                AI Assistant
              </span>
              <span className="text-sm font-bold text-white tracking-tight leading-snug">
                {isAuthenticated ? `Hi, ${user?.name?.split(' ')[0]}` : 'Ask HealthSync'}
              </span>
            </div>

            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse ml-0.5" />
          </button>
        )}

        {/* ========================================================
            2. INTERACTIVE CHAT WINDOW (POPUP DRAWER)
        ======================================================== */}
        {isOpen && (
          <div className="w-[calc(100vw-2rem)] sm:w-[410px] h-[580px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white px-4 py-3.5 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-teal-600/60 border border-teal-400/30 flex items-center justify-center shadow-inner">
                    <Bot className="w-5 h-5 text-teal-100" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-white tracking-tight">HealthSync AI</h3>
                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 bg-teal-500/30 border border-teal-400/30 rounded text-teal-200">
                      RAG Agent
                    </span>
                  </div>
                  <p className="text-xs text-teal-200/80">
                    Live Neon DB • Redis 5-min Locking
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleClearChat}
                  title="Clear conversation"
                  className="p-1.5 text-teal-200/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Minimize"
                  className="p-1.5 text-teal-200/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Authentication Context Banner */}
            <div className={`px-3.5 py-2 text-xs flex items-center justify-between border-b ${
              isAuthenticated 
                ? 'bg-emerald-50/90 text-emerald-900 border-emerald-100' 
                : 'bg-amber-50/90 text-amber-900 border-amber-100'
            }`}>
              <div className="flex items-center gap-1.5 truncate">
                {isAuthenticated ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      Connected: <strong>{user?.name}</strong> ({user?.role})
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Browsing as <strong>Guest</strong></span>
                  </>
                )}
              </div>

              {!isAuthenticated && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/login');
                  }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-white px-2 py-0.5 rounded border border-amber-200 hover:bg-teal-50 transition-colors shrink-0 shadow-xs"
                >
                  <LogIn className="w-3 h-3" />
                  Log in
                </button>
              )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-xs ${
                        isUser
                          ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-br-xs'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                      }`}
                    >
                      {isUser ? (
                        <p className="text-sm">{msg.text}</p>
                      ) : (
                        <div>{renderFormattedText(msg.text)}</div>
                      )}

                      {/* Render Interactive DB Cards (Appointments / Doctors) */}
                      {msg.cards && msg.cards.length > 0 && (
                        <div className="mt-3 space-y-2 border-t border-slate-100 pt-2.5">
                          {msg.cards.map((card, cIdx) => {
                            if (card.type === 'appointment') {
                              return (
                                <div
                                  key={cIdx}
                                  className="bg-teal-50/80 border border-teal-200 rounded-xl p-3 text-xs text-slate-800 space-y-1.5 shadow-xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-teal-900 text-sm">
                                      {card.doctorName}
                                    </span>
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
                                      {card.status}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-slate-600 text-[11px]">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-teal-600" />
                                      {new Date(card.date).toLocaleDateString()}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-teal-600" />
                                      {card.time?.slice(0, 5)}
                                    </span>
                                  </div>
                                  <div className="pt-1 flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        setIsOpen(false);
                                        navigate('/appointments');
                                      }}
                                      className="flex-1 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-center transition-colors text-[11px] flex items-center justify-center gap-1"
                                    >
                                      View in Dashboard
                                      <ArrowRight className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            if (card.type === 'doctor') {
                              return (
                                <div
                                  key={cIdx}
                                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 space-y-1.5 hover:border-teal-300 transition-colors shadow-xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-semibold text-slate-900 text-sm">
                                        {card.name}
                                      </p>
                                      <p className="text-[11px] text-teal-700 font-medium">
                                        {card.specialization} • {card.experience} yrs
                                      </p>
                                    </div>
                                    <span className="text-right">
                                      <span className="text-xs font-bold text-slate-900">
                                        ₹{card.fee}
                                      </span>
                                      <span className="block text-[10px] text-amber-600 font-semibold">
                                        ⭐ {card.rating}
                                      </span>
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setIsOpen(false);
                                      navigate(`/book/${card.id}`);
                                    }}
                                    className="w-full py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-center transition-colors text-[11px] flex items-center justify-center gap-1 mt-1"
                                  >
                                    <Stethoscope className="w-3 h-3" />
                                    Book Consultation Slot
                                  </button>
                                </div>
                              );
                            }

                            return null;
                          })}
                        </div>
                      )}

                      <span
                        className={`text-[9px] mt-1.5 block ${
                          isUser ? 'text-teal-200 text-right' : 'text-slate-400 text-left'
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Typing / Querying Indicator */}
              {loading && (
                <div className="flex gap-2.5 items-center">
                  <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-2.5 shadow-xs flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" />
                    <span className="text-xs text-slate-500 ml-1.5">Consulting database...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Dynamic Suggestions Prompt Chips (Personalized by Auth) */}
            {suggestions.length > 0 && (
              <div className="p-2.5 bg-slate-100/90 border-t border-slate-200 overflow-x-auto flex gap-1.5 no-scrollbar">
                {suggestions.map((suggestion, sIdx) => (
                  <button
                    key={sIdx}
                    onClick={() => handleSendMessage(suggestion)}
                    disabled={loading}
                    className="shrink-0 text-[11px] font-medium bg-white hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 text-slate-700 px-2.5 py-1.5 rounded-full border border-slate-300 shadow-xs transition-colors text-left"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  isAuthenticated
                    ? 'Ask about your bookings or doctor slots...'
                    : 'Ask about doctors, symptoms, or 5-min slot lock...'
                }
                disabled={loading}
                className="flex-1 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || loading}
                className="p-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:hover:bg-teal-600 text-white rounded-xl shadow-xs transition-colors shrink-0"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
};
